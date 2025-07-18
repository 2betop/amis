/**
 * @file 用来生成 json-schemas
 */

import fs = require('fs');
import path = require('path');
import tsj = require('ts-json-schema-generator');
import mkdirp = require('mkdirp');

/**
 * 程序主入口
 */
async function main() {
  const dir = path.join(__dirname, '../packages/amis/src');
  const outDir = path.join(__dirname, '../packages/amis/');
  const tsConfig = path.join(
    __dirname,
    '../packages/amis/tsconfig-for-declaration.json'
  );

  const config = {
    path: path.join(dir, 'Schema.ts'),
    tsconfig: tsConfig,
    type: 'RootSchema',
    skipTypeCheck: true
  };

  const generator = tsj.createGenerator(config);
  const schema = generator.createSchema(config.type);

  const outputFile = path.join(outDir, 'schema.json');
  mkdirp(path.dirname(outputFile));
  fs.writeFileSync(outputFile, JSON.stringify(schema, null, 2));
}

main().catch(e => {
  console.error(e);
});
