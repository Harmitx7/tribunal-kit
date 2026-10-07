const crypto = require('crypto');

function createReviewPackage(skillId, expectations, observations) {
  const pkg = {
    skill_id: skillId,
    timestamp: new Date().toISOString(),
    expectations,
    observations,
  };
  pkg.hash = crypto.createHash('sha256').update(JSON.stringify(pkg)).digest('hex');
  return pkg;
}

function processHumanValidation(reviewPackage, decision, reviewerName, reason) {
  if (!['ACCEPT', 'REJECT', 'REQUEST_MORE_EVIDENCE'].includes(decision)) {
    throw new Error('Invalid decision');
  }

  return {
    reviewer: reviewerName,
    timestamp: new Date().toISOString(),
    scope: 'behavioral',
    decision,
    reason,
    hash_of_review_package: reviewPackage.hash,
  };
}

module.exports = {
  createReviewPackage,
  processHumanValidation,
};
