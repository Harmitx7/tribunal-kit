'use strict';

/**
 * index.js — Software Verification & Formal Methods Central Barrel
 * =================================================================
 * Domain: Software Verification & Formal Methods (software-verification-formal-methods)
 *
 * Unifies all verification schemas, Design-by-Contract gates, property-based testing,
 * state machine verification, mutation testing, and differential testing engines.
 */

const schemas = require('./verification_schemas');
const contract = require('./contract_engine');
const property = require('./property_testing_engine');
const stateMachine = require('./state_machine_engine');
const mutation = require('./mutation_testing_engine');
const differential = require('./differential_testing_engine');

module.exports = {
  // Verification Schemas & Validation Contracts
  SUPPORTED_VERIFICATION_VERSIONS: schemas.SUPPORTED_VERIFICATION_VERSIONS,
  VERIFICATION_STATUSES: schemas.VERIFICATION_STATUSES,
  VERIFICATION_METHODS: schemas.VERIFICATION_METHODS,
  VerificationCaseSchema: schemas.VerificationCaseSchema,
  VerificationResultSchema: schemas.VerificationResultSchema,
  InvariantRecordSchema: schemas.InvariantRecordSchema,
  RequirementTraceSchema: schemas.RequirementTraceSchema,
  validateVerificationCase: schemas.validateVerificationCase,
  validateVerificationResult: schemas.validateVerificationResult,
  validateInvariantRecord: schemas.validateInvariantRecord,
  validateRequirementTrace: schemas.validateRequirementTrace,

  // Design-by-Contract (DbC) Engine
  ContractViolationError: contract.ContractViolationError,
  requires: contract.requires,
  ensures: contract.ensures,
  checkInvariant: contract.checkInvariant,
  withContract: contract.withContract,
  auditContractCompleteness: contract.auditContractCompleteness,

  // Property-Based Testing & Shrinking Engine
  createPRNG: property.createPRNG,
  arb: property.arb,
  assertProperty: property.assertProperty,
  shrinkCounterexample: property.shrinkCounterexample,

  // Finite State Machine (FSM) Model Checker
  verifyFsmCompleteness: stateMachine.verifyFsmCompleteness,
  createFsmInstance: stateMachine.createFsmInstance,

  // Mutation Testing & Kill-Score Engine
  MUTATION_OPERATORS: mutation.MUTATION_OPERATORS,
  generateMutants: mutation.generateMutants,
  evaluateMutants: mutation.evaluateMutants,

  // Differential & Metamorphic Testing Engine
  areEquivalent: differential.areEquivalent,
  runDifferentialTest: differential.runDifferentialTest,
  verifyMetamorphicRelation: differential.verifyMetamorphicRelation,
};
