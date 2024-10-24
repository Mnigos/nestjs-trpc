import { Node, SourceFile, Type } from 'ts-morph';
import {
  ProcedureGeneratorMetadata,
  SourceFileImportsMap,
} from '../interfaces/generator.interface';

export function findCtxOutProperty(type: Type): string | undefined {
  const typeText = type.getText();
  const ctxOutMatch = typeText.match(/_ctx_out:\s*{([^}]*)}/);

  return ctxOutMatch ? ctxOutMatch[1].trim() : undefined;
}

export function generateProcedureString(
  procedure: ProcedureGeneratorMetadata,
): string {
  const { name, decorators } = procedure;
  const decorator = decorators.find(
    (d) => d.name === 'Mutation' || d.name === 'Query',
  );

  if (!decorator) {
    return '';
  }

  const decoratorArgumentsArray = Object.entries(decorator.arguments)
    .map(([key, value]) => `.${key}(${value})`)
    .join('');

  return `${name}: publicProcedure${decoratorArgumentsArray}.${decorator.name.toLowerCase()}(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any )`;
}

export function flattenZodSchema(
  node: Node,
  importsMap: Map<string, SourceFileImportsMap>,
  sourceFile: SourceFile,
  schema: string,
): string {
  if (Node.isIdentifier(node)) {
    const identifierName = node.getText();
    const identifierDeclaration =
      sourceFile.getVariableDeclaration(identifierName);

    if (identifierDeclaration != null) {
      const identifierInitializer = identifierDeclaration.getInitializer();

      if (identifierInitializer != null) {
        const identifierSchema = flattenZodSchema(
          identifierInitializer,
          importsMap,
          sourceFile,
          identifierInitializer.getText(),
        );

        schema = schema.replace(identifierName, identifierSchema);
      }
    } else if (importsMap.has(identifierName)) {
      const importedIdentifier = importsMap.get(identifierName);

      if (importedIdentifier != null) {
        const { initializer } = importedIdentifier;
        const identifierSchema = flattenZodSchema(
          initializer,
          importsMap,
          importedIdentifier.sourceFile,
          initializer.getText(),
        );

        schema = schema.replace(identifierName, identifierSchema);
      }
    }
  } else if (Node.isObjectLiteralExpression(node)) {
    for (const property of node.getProperties()) {
      if (Node.isPropertyAssignment(property)) {
        const propertyText = property.getText();
        const propertyInitializer = property.getInitializer();

        if (propertyInitializer != null) {
          schema = schema.replace(
            propertyText,
            flattenZodSchema(
              propertyInitializer,
              importsMap,
              sourceFile,
              propertyText,
            ),
          );
        }
      }
    }
  } else if (Node.isArrayLiteralExpression(node)) {
    for (const element of node.getElements()) {
      const elementText = element.getText();
      schema = schema.replace(
        elementText,
        flattenZodSchema(element, importsMap, sourceFile, elementText),
      );
    }
  } else if (Node.isCallExpression(node)) {
    const expression = node.getExpression();
    if (
      Node.isPropertyAccessExpression(expression) &&
      !expression.getText().startsWith('z')
    ) {
      const baseSchema = flattenZodSchema(
        expression,
        importsMap,
        sourceFile,
        expression.getText(),
      );
      const propertyName = expression.getName();
      schema = schema.replace(
        expression.getText(),
        `${baseSchema}.${propertyName}`,
      );
    }
    for (const arg of node.getArguments()) {
      const argText = arg.getText();
      schema = schema.replace(
        argText,
        flattenZodSchema(arg, importsMap, sourceFile, argText),
      );
    }
  } else if (Node.isPropertyAccessExpression(node)) {
    schema = flattenZodSchema(
      node.getExpression(),
      importsMap,
      sourceFile,
      node.getExpression().getText(),
    );
  }

  return schema;
}
