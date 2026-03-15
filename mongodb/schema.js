/**
 * BeSQL — MongoDB Database Schema
 * ================================
 *
 * DATABASE CHOICE
 * ---------------
 * MongoDB is used as the production database for BeSQL.
 *
 * Reasons:
 *  1. FLEXIBLE SCHEMA  — Problems, contests, and submissions carry
 *     varying metadata that maps naturally to documents.
 *  2. EMBEDDED ARRAYS   — Tags, problem IDs per contest, and test
 *     cases fit neatly inside their parent documents.
 *  3. AGGREGATION PIPELINE — Leaderboard ranking, contest scoreboards,
 *     and submission statistics are well-served by $group / $lookup.
 *  4. CHANGE STREAMS    — Real-time scoreboards and contest updates
 *     via change streams (similar to live subscriptions).
 *  5. ATLAS FREE TIER   — Generous limits for a growing platform.
 *
 * HOW TO USE
 * ----------
 * Option A – Run this file directly with mongosh:
 *   mongosh "mongodb+srv://..." --file mongodb/schema.js
 *
 * Option B – Use in a Node.js setup script:
 *   const { MongoClient } = require('mongodb');
 *   const client = new MongoClient(process.env.MONGODB_URI);
 *   // ... paste the createCollection / createIndex calls below
 *
 * Schema version: 2.0.0
 */

// Switch to (or create) the besql database
const DB_NAME = 'besql';
db = db.getSiblingDB(DB_NAME);

// =============================================================
// PROFILES (users)
// =============================================================
db.createCollection('profiles', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['username', 'role', 'score', 'solved', 'streak', 'joinedAt'],
      properties: {
        username:  { bsonType: 'string', minLength: 3, description: 'Unique display name' },
        password:  { bsonType: 'string', description: 'Hashed password (use bcrypt in production)' },
        role:      { enum: ['contestant', 'master', 'admin'], description: 'User role' },
        score:     { bsonType: 'int', minimum: 0 },
        solved:    { bsonType: 'int', minimum: 0 },
        streak:    { bsonType: 'int', minimum: 0 },
        lastSolve: { bsonType: ['date', 'null'] },
        avatarUrl: { bsonType: ['string', 'null'] },
        bio:       { bsonType: ['string', 'null'] },
        joinedAt:  { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
      },
    },
  },
});

db.profiles.createIndex({ username: 1 }, { unique: true });
db.profiles.createIndex({ score: -1 });
db.profiles.createIndex({ solved: -1 });

// =============================================================
// PROBLEMS
// =============================================================
db.createCollection('problems', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['code', 'title', 'description', 'difficulty', 'points', 'solution'],
      properties: {
        code:         { bsonType: 'string', description: "e.g. 'BSQ-001'" },
        title:        { bsonType: 'string' },
        description:  { bsonType: 'string' },
        difficulty:   { enum: ['Easy', 'Medium', 'Hard', 'Expert'] },
        points:       { bsonType: 'int', minimum: 1 },
        tags:         { bsonType: 'array', items: { bsonType: 'string' } },
        solution:     { bsonType: 'string', description: 'Canonical correct SQL' },
        schemaHint:   { bsonType: ['object', 'null'], description: '{ table, columns: [[col,type]] }' },
        sampleOutput: { bsonType: ['object', 'null'], description: '{ columns, rows }' },
        timeLimit:    { bsonType: 'int', description: 'Seconds (default 300)' },
        dailyDate:    { bsonType: ['date', 'null'], description: 'Set = featured as daily problem' },
        isPublic:     { bsonType: 'bool' },
        createdBy:    { bsonType: ['objectId', 'null'] },
        testCases: {
          bsonType: 'array',
          description: 'Embedded test cases for this problem',
          items: {
            bsonType: 'object',
            required: ['name'],
            properties: {
              name:        { bsonType: 'string' },
              description: { bsonType: ['string', 'null'] },
              sortOrder:   { bsonType: 'int' },
            },
          },
        },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
      },
    },
  },
});

db.problems.createIndex({ code: 1 }, { unique: true });
db.problems.createIndex({ difficulty: 1 });
db.problems.createIndex({ dailyDate: 1 });
db.problems.createIndex({ tags: 1 });

// =============================================================
// CONTESTS
// =============================================================
db.createCollection('contests', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['title', 'status', 'startTime', 'endTime', 'problemIds'],
      properties: {
        title:       { bsonType: 'string' },
        description: { bsonType: ['string', 'null'] },
        status:      { enum: ['upcoming', 'live', 'ended', 'custom'] },
        startTime:   { bsonType: 'date' },
        endTime:     { bsonType: 'date' },
        problemIds:  { bsonType: 'array', items: { bsonType: 'objectId' } },
        isPublic:    { bsonType: 'bool' },
        inviteCode:  { bsonType: ['string', 'null'], description: 'null = public contest' },
        createdBy:   { bsonType: ['objectId', 'null'] },
        announcements: {
          bsonType: 'array',
          description: 'Embedded announcements for the contest',
          items: {
            bsonType: 'object',
            required: ['message', 'postedAt'],
            properties: {
              message:  { bsonType: 'string' },
              postedBy: { bsonType: ['objectId', 'null'] },
              postedAt: { bsonType: 'date' },
            },
          },
        },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
      },
    },
  },
});

db.contests.createIndex({ status: 1 });
db.contests.createIndex({ startTime: 1 });
db.contests.createIndex({ inviteCode: 1 }, { unique: true, sparse: true });

// =============================================================
// SUBMISSIONS
// =============================================================
db.createCollection('submissions', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'problemId', 'code', 'verdict', 'tcPassed', 'tcTotal', 'timeTaken', 'submittedAt'],
      properties: {
        userId:      { bsonType: 'objectId' },
        problemId:   { bsonType: 'objectId' },
        contestId:   { bsonType: ['objectId', 'null'] },
        code:        { bsonType: 'string', description: "User's SQL" },
        verdict:     { enum: ['AC', 'WA', 'TLE', 'CE'] },
        tcPassed:    { bsonType: 'int', minimum: 0 },
        tcTotal:     { bsonType: 'int', minimum: 0 },
        timeTaken:   { bsonType: 'int', minimum: 0, description: 'Seconds elapsed' },
        submittedAt: { bsonType: 'date' },
      },
    },
  },
});

db.submissions.createIndex({ userId: 1, submittedAt: -1 });
db.submissions.createIndex({ problemId: 1 });
db.submissions.createIndex({ contestId: 1 }, { sparse: true });
db.submissions.createIndex({ userId: 1, problemId: 1, verdict: 1 });

// =============================================================
// AGGREGATION PIPELINES (reference examples)
// =============================================================

/**
 * LEADERBOARD — ranked user scores.
 *
 *   db.profiles.aggregate([
 *     { $match: { role: { $ne: 'admin' } } },
 *     { $sort:  { score: -1, solved: -1 } },
 *     { $group: {
 *         _id: null,
 *         users: { $push: { userId: '$_id', username: '$username', role: '$role',
 *                            score: '$score', solved: '$solved', streak: '$streak' } }
 *     }},
 *     { $unwind: { path: '$users', includeArrayIndex: 'rank' } },
 *     { $replaceRoot: { newRoot: { $mergeObjects: ['$users', { rank: { $add: ['$rank', 1] } }] } } },
 *   ]);
 */

/**
 * CONTEST SCOREBOARD — per-contest user rankings.
 *
 *   db.submissions.aggregate([
 *     { $match: { contestId: ObjectId('<contest_id>'), verdict: 'AC' } },
 *     { $group: {
 *         _id: { contestId: '$contestId', userId: '$userId' },
 *         problemsSolved: { $addToSet: '$problemId' },
 *         firstSolve:     { $min: '$submittedAt' },
 *     }},
 *     { $lookup: { from: 'profiles', localField: '_id.userId', foreignField: '_id', as: 'user' } },
 *     { $unwind: '$user' },
 *     { $lookup: { from: 'problems', localField: 'problemsSolved', foreignField: '_id', as: 'probs' } },
 *     { $addFields: {
 *         username:       '$user.username',
 *         problemsSolved: { $size: '$problemsSolved' },
 *         totalPoints:    { $sum: '$probs.points' },
 *     }},
 *     { $sort: { totalPoints: -1, firstSolve: 1 } },
 *   ]);
 */

/**
 * UPDATE STREAK — server-side logic (implement in your backend API).
 *
 * When a new AC submission is inserted:
 *  1. Check if the user already solved this problem today (skip if so).
 *  2. Load the user profile.
 *  3. If lastSolve == yesterday  → streak += 1, lastSolve = today.
 *     Else if lastSolve < yesterday or null → streak = 1, lastSolve = today.
 *     Else (same day) → no change.
 *  4. Increment solved += 1 and score += problem.points.
 *
 * This can be implemented as middleware in your Express/Fastify route
 * handler, or as a MongoDB Atlas Trigger (App Services).
 */

print('✓ BeSQL MongoDB schema created successfully.');
