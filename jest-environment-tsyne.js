const NodeEnvironment = require('jest-environment-node').default;

class TsyneEnvironment extends NodeEnvironment {
  async setup() {
    await super.setup();
    this.global.tsyne = {
      __setGlobalContext: (context) => {
        this.global.tsyne = { ...this.global.tsyne, ...context };
      },
    };
  }

  async teardown() {
    await super.teardown();
  }
}

module.exports = TsyneEnvironment;
