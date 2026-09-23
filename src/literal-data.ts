import {readFile, stat} from 'node:fs/promises';
import ts from 'typescript';

type LiteralValue = null | boolean | number | string | LiteralValue[] | {[key: string]: LiteralValue};
const MAX_SOURCE_BYTES = 5 * 1024 * 1024;
const blockedPropertyNames = new Set(['__proto__', 'constructor', 'prototype']);

const unwrap = (expression: ts.Expression): ts.Expression => {
  if (ts.isAsExpression(expression)
    || ts.isTypeAssertionExpression(expression)
    || ts.isSatisfiesExpression(expression)
    || ts.isParenthesizedExpression(expression)) {
    return unwrap(expression.expression);
  }
  return expression;
};

const propertyName = (name: ts.PropertyName, filePath: string): string => {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  throw new Error(`Unsupported computed property in ${filePath}.`);
};

const literalValue = (input: ts.Expression, filePath: string): LiteralValue => {
  const expression = unwrap(input);
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return expression.text;
  }
  if (ts.isNumericLiteral(expression)) {
    const value = Number(expression.text);
    if (!Number.isFinite(value)) throw new Error(`Invalid number in imported data from ${filePath}.`);
    return value;
  }
  if (expression.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (expression.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (expression.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isPrefixUnaryExpression(expression)
    && expression.operator === ts.SyntaxKind.MinusToken
    && ts.isNumericLiteral(expression.operand)) {
    return -Number(expression.operand.text);
  }
  if (ts.isArrayLiteralExpression(expression)) {
    return expression.elements.map(element => {
      if (ts.isSpreadElement(element)) {
        throw new Error(`Spread elements are not allowed in imported data from ${filePath}.`);
      }
      return literalValue(element, filePath);
    });
  }
  if (ts.isObjectLiteralExpression(expression)) {
    const result = Object.create(null) as {[key: string]: LiteralValue};
    for (const property of expression.properties) {
      if (!ts.isPropertyAssignment(property)) {
        throw new Error(`Only plain property assignments are allowed in imported data from ${filePath}.`);
      }
      const key = propertyName(property.name, filePath);
      if (blockedPropertyNames.has(key)) {
        throw new Error(`Blocked property name in imported data from ${filePath}.`);
      }
      result[key] = literalValue(property.initializer, filePath);
    }
    return result;
  }
  throw new Error(`Only JSON-like literals are allowed in imported data from ${filePath}.`);
};

export const readLiteralArray = async (filePath: string, variableName: string): Promise<unknown[]> => {
  const file = await stat(filePath);
  if (!file.isFile() || file.size > MAX_SOURCE_BYTES) {
    throw new Error(`Imported data file must be a regular file no larger than ${MAX_SOURCE_BYTES} bytes.`);
  }
  const source = await readFile(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== variableName) continue;
      if (!declaration.initializer) throw new Error(`${variableName} has no value in ${filePath}.`);
      const value = literalValue(declaration.initializer, filePath);
      if (!Array.isArray(value)) throw new Error(`${variableName} must be an array in ${filePath}.`);
      return value;
    }
  }
  throw new Error(`Could not find ${variableName} in ${filePath}.`);
};
