/**
 * Storage Module Index
 * Aggregates all storage-related functionality
 * 
 * Usage:
 * - Include in HTML before app.js:
 *   <script src="js/storage/storage.js"></script>
 *   <script src="js/storage/relational.js"></script>
 *   <script src="js/storage/index.js"></script>
 */

// Re-export all storage functions
const StorageAPI = {
  // Initialization
  initStorage,
  
  // Local storage
  LS,
  LSAsync,
  
  // Cloud operations
  cloudUpsert,
  cloudDelete,
  flushAndWait,
  
  // Relational operations
  syncUserToRelational,
  syncSubmissionToRelational,
  syncProblemToRelational,
  deactivateProblemInRelational,
  loadProblemsFromRelational,
  fetchRelationalAuthUser,
  getRelationalUserId,
  syncContestToRelational,
  deleteContestFromRelational,
  fetchRelationalSubmissionsForUser,
  hydrateSubmissionsFromRelational,
  
  // Utilities
  serializeProblemTestCases,
  hydrateProblemFromRelationalRow,
  serializeContestForRelational,
  hydrateContestFromRelationalRow,
};


// Make available globally
if (typeof window !== 'undefined') {
  window.StorageAPI = StorageAPI;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageAPI;
}
