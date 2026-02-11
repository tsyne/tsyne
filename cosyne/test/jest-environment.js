/**
 * Custom Jest environment that exposes the describe/it name hierarchy
 * as a global array for TestJournal to display in the content header.
 *
 * jest-circus fires handleTestEvent('test_start') with the full parent chain.
 */
const { TestEnvironment } = require('jest-environment-node');

class CosyneTestEnvironment extends TestEnvironment {
  async handleTestEvent(event) {
    if (event.name === 'test_start') {
      const names = [];
      let block = event.test.parent;
      while (block && block.name !== 'ROOT_DESCRIBE_BLOCK') {
        names.unshift(block.name);
        block = block.parent;
      }
      names.push(event.test.name);
      this.global.__JEST_TEST_NAMES__ = names;
    }
  }
}

module.exports = CosyneTestEnvironment;
