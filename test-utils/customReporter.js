const fs = require('fs');

class CustomReporter {
  constructor(globalConfig, options) {
    this._output = options.output || './test-report.json';
  }

  onRunComplete(contexts, results) {
    const summary = {
      numTotalTests: results.numTotalTests,
      numPassedTests: results.numPassedTests,
      numFailedTests: results.numFailedTests,
      numPendingTests: results.numPendingTests,
      testResults: results.testResults.map(tr => ({
        name: tr.name,
        status: tr.status,
        assertionResults: (tr.assertionResults || []).map(ar => ({
          title: ar.title,
          status: ar.status,
          failureMessages: ar.failureMessages || [],
        })),
      })),
    };
    fs.writeFileSync(this._output, JSON.stringify(summary, null, 2));
  }
}

module.exports = CustomReporter; 