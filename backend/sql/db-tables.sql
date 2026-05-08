-- ============================================================
-- BeSQL Platform — CREATE TABLE statements
-- For quoted CamelCase tables used by BSQ-009 to BSQ-100 datasets
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS "CitizenMentalHealth" (
  "CITIZEN_ID"        INT PRIMARY KEY,
  "CITIZEN_NAME"      VARCHAR(100) NOT NULL,
  "SECTOR"            VARCHAR(100) NOT NULL,
  "STABILITY_RATING"  NUMERIC(5,2) NOT NULL,
  "LAST_CHECKUP"      DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS "OperativeProfiles" (
  "OPERATIVE_ID"          INT PRIMARY KEY,
  "OPERATIVE_NAME"        VARCHAR(100) NOT NULL,
  "CLEARANCE_LEVEL"       VARCHAR(50) NOT NULL,
  "ORGANIZATIONS_COUNT"   INT NOT NULL,
  "RECRUITMENT_DATE"      DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS "AgentRecords" (
  "RECORD_ID"         INT PRIMARY KEY,
  "AGENT_NAME"        VARCHAR(100) NOT NULL,
  "DIVISION_NAME"     VARCHAR(100) NOT NULL,
  "ENTRY_DATE"        DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS "CreditLedger" (
  "TXN_ID"            INT PRIMARY KEY,
  "ACCOUNT_ID"        INT NOT NULL,
  "CREDITS"           INT NOT NULL,
  "TXN_DATE"          DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS "Agents" (
  "AGENT_ID"          INT PRIMARY KEY,
  "AGENT_NAME"        VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS "Exchanges" (
  "YEAR"              INT NOT NULL,
  "GIVER_ID"          INT NOT NULL,
  "RECEIVER_ID"       INT NOT NULL,
  PRIMARY KEY ("YEAR","GIVER_ID","RECEIVER_ID")
);

CREATE TABLE IF NOT EXISTS "Follows" (
  "CITIZEN_ID"            INT NOT NULL,
  "FOLLOWED_CITIZEN_ID"   INT NOT NULL,
  PRIMARY KEY ("CITIZEN_ID","FOLLOWED_CITIZEN_ID")
);

CREATE TABLE IF NOT EXISTS "Posts" (
  "POST_ID"           INT PRIMARY KEY,
  "CITIZEN_ID"        INT NOT NULL,
  "CONTENT"           TEXT NOT NULL,
  "POST_DATE"         DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS "Divisions" (
  "DIVISION_ID"       INT PRIMARY KEY,
  "DIVISION_NAME"     VARCHAR(100) NOT NULL,
  "CHIEF_ID"          INT
);

CREATE TABLE IF NOT EXISTS "DivisionAgents" (
  "AGENT_ID"          INT PRIMARY KEY,
  "AGENT_NAME"        VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS "OperativeStatus" (
  "OPERATIVE_ID"        INT PRIMARY KEY,
  "OPERATIVE_NAME"      VARCHAR(100) NOT NULL,
  "DIVISION"            VARCHAR(100) NOT NULL,
  "ENERGY_LEVEL"        INT NOT NULL,
  "LAST_MISSION_DATE"   DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS "CreditTransactions" (
  "TRANSACTION_ID"    INT PRIMARY KEY,
  "SENDER_NAME"       VARCHAR(100) NOT NULL,
  "RECEIVER_NAME"     VARCHAR(100) NOT NULL,
  "BASE_VALUE"        INT NOT NULL,
  "MULTIPLIER"        INT NOT NULL
);

CREATE TABLE IF NOT EXISTS "SectorStats" (
  "SECTOR_ID"         INT PRIMARY KEY,
  "SECTOR"            VARCHAR(100) NOT NULL,
  "POPULATION"        INT NOT NULL,
  "THREAT_LEVEL"      VARCHAR(50) NOT NULL,
  "COMMANDER"         VARCHAR(100) NOT NULL,
  "ESTABLISHED"       INT NOT NULL
);

CREATE TABLE IF NOT EXISTS "MissionLogs" (
  "MISSION_ID"        INT PRIMARY KEY,
  "AGENT_NAME"        VARCHAR(100) NOT NULL,
  "MISSION_TYPE"      VARCHAR(50) NOT NULL,
  "SUCCESS"           SMALLINT NOT NULL,
  "DURATION_HRS"      INT NOT NULL,
  "MISSION_DATE"      DATE NOT NULL,
  "SECTOR"            VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS "AgentSkills" (
  "AGENT_ID"          INT NOT NULL,
  "AGENT_NAME"        VARCHAR(100) NOT NULL,
  "SKILL"             VARCHAR(100) NOT NULL,
  "PROFICIENCY"       INT NOT NULL,
  "CERTIFIED"         SMALLINT NOT NULL,
  PRIMARY KEY ("AGENT_ID","SKILL")
);

CREATE TABLE IF NOT EXISTS "DataVaultInventory" (
  "ITEM_ID"           INT PRIMARY KEY,
  "ITEM_NAME"         VARCHAR(150) NOT NULL,
  "CATEGORY"          VARCHAR(100) NOT NULL,
  "QUANTITY"          INT NOT NULL,
  "UNIT_COST"         INT NOT NULL,
  "LAST_RESTOCKED"    DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS "AgentRankHistory" (
  "HISTORY_ID"        INT PRIMARY KEY,
  "AGENT_NAME"        VARCHAR(100) NOT NULL,
  "RANK"              VARCHAR(100) NOT NULL,
  "FROM_DATE"         DATE NOT NULL,
  "TO_DATE"           DATE
);

CREATE TABLE IF NOT EXISTS "ThreatAlerts" (
  "ALERT_ID"          INT PRIMARY KEY,
  "SECTOR"            VARCHAR(100) NOT NULL,
  "THREAT_TYPE"       VARCHAR(100) NOT NULL,
  "SEVERITY"          VARCHAR(50) NOT NULL,
  "REPORTED_AT"       TIMESTAMP NOT NULL,
  "RESOLVED"          SMALLINT NOT NULL
);

CREATE TABLE IF NOT EXISTS "CitizenRegistry" (
  "CITIZEN_ID"         INT PRIMARY KEY,
  "CITIZEN_NAME"       VARCHAR(100) NOT NULL,
  "SECTOR"             VARCHAR(100) NOT NULL,
  "REGISTRATION_DATE"  DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS "SectorStatus" (
  "SECTOR_ID"          INT PRIMARY KEY,
  "SECTOR_NAME"        VARCHAR(100) NOT NULL,
  "STABILITY_INDEX"    INT NOT NULL,
  "POPULATION"         INT NOT NULL,
  "LAST_SCAN_DATE"     DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS "AnomalyTracker" (
  "ANOMALY_ID"         INT PRIMARY KEY,
  "ANOMALY_NAME"       VARCHAR(150) NOT NULL,
  "SECTOR"             VARCHAR(100) NOT NULL,
  "SEVERITY_SCORE"     INT NOT NULL,
  "DETECTED_DATE"      DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS "BriefingLog" (
  "LOG_ID"             INT PRIMARY KEY,
  "AGENT_NAME"         VARCHAR(100) NOT NULL,
  "TEAM_SIZE"          INT NOT NULL,
  "BRIEFING_DATE"      DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS "ArchiveAccess" (
  "AGENT_ID"           INT NOT NULL,
  "AGENT_NAME"         VARCHAR(100) NOT NULL,
  "ARCHIVE_ID"         INT NOT NULL,
  "ARCHIVE_NAME"       VARCHAR(150) NOT NULL,
  PRIMARY KEY ("AGENT_ID","ARCHIVE_ID")
);

CREATE TABLE IF NOT EXISTS "Sectors" (
  "SECTOR_ID"          INT PRIMARY KEY,
  "SECTOR_NAME"        VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS "Assignments" (
  "AGENT_ID"           INT NOT NULL,
  "SECTOR_ID"          INT NOT NULL,
  PRIMARY KEY ("AGENT_ID","SECTOR_ID")
);

CREATE TABLE IF NOT EXISTS "CafeOrders" (
  "ORDER_ID"           INT PRIMARY KEY,
  "CITIZEN_ID"         INT NOT NULL,
  "DRINK"              VARCHAR(120) NOT NULL,
  "ORDER_TIME"         TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "TrainingScores" (
  "SESSION_ID"         INT PRIMARY KEY,
  "AGENT_NAME"         VARCHAR(100) NOT NULL,
  "SESSION_DATE"       DATE NOT NULL,
  "POINTS"             INT NOT NULL
);

CREATE TABLE IF NOT EXISTS "YearlyCredits" (
  "YEAR"               INT PRIMARY KEY,
  "TOTAL_CREDITS"      INT NOT NULL
);

COMMIT;

-- ============================================================
-- BeSQL Platform — PostgreSQL INSERT Statements
-- All NEW datasets used by BSQ-009 to BSQ-100
-- ============================================================

BEGIN;

INSERT INTO "CitizenMentalHealth" ("CITIZEN_ID","CITIZEN_NAME","SECTOR","STABILITY_RATING","LAST_CHECKUP") VALUES
(1,'Vex','Alpha',4.2,'2901-01-01'),
(2,'Nova','Beta',1.5,'2901-01-01'),
(3,'Echo','Gamma',2.0,'2901-01-02'),
(4,'Ryn','Delta',0.8,'2901-01-02'),
(5,'Zara','Alpha',3.7,'2901-01-03'),
(6,'Marcus','Beta',1.9,'2901-01-03');

INSERT INTO "OperativeProfiles" ("OPERATIVE_ID","OPERATIVE_NAME","CLEARANCE_LEVEL","ORGANIZATIONS_COUNT","RECRUITMENT_DATE") VALUES
(1,'Zara','Alpha',3,'2900-01-01'),
(2,'Marcus','Beta',2,'2900-06-15'),
(3,'Nova','Alpha',1,'2901-01-01'),
(4,'Ryn','Alpha',2,'2900-03-20'),
(5,'Echo','Gamma',4,'2899-11-10'),
(6,'Vex','Alpha',1,'2901-02-01');

INSERT INTO "AgentRecords" ("RECORD_ID","AGENT_NAME","DIVISION_NAME","ENTRY_DATE") VALUES
(1,'Zara','Recon','2901-01-01'),
(2,'Zara','Recon','2901-01-05'),
(3,'Marcus','Intel','2901-01-02'),
(4,'Nova','Field','2901-01-03'),
(5,'Zara','Intel','2901-01-04'),
(6,'Nova','Field','2901-01-06'),
(7,'Nova','Field','2901-01-07');

INSERT INTO "CreditLedger" ("TXN_ID","ACCOUNT_ID","CREDITS","TXN_DATE") VALUES
(1,101,100,'2901-01-01'),
(2,101,200,'2901-01-02'),
(3,102,150,'2901-01-01'),
(4,101,400,'2901-01-03'),
(5,102,300,'2901-01-04'),
(6,103,500,'2901-01-01');

INSERT INTO "Agents" ("AGENT_ID","AGENT_NAME") VALUES
(1,'Zara'),
(2,'Marcus'),
(3,'Nova'),
(4,'Ryn');

INSERT INTO "Exchanges" ("YEAR","GIVER_ID","RECEIVER_ID") VALUES
(2899,1,2),
(2899,3,4),
(2900,2,1),
(2900,4,3),
(2901,1,3);

INSERT INTO "Follows" ("CITIZEN_ID","FOLLOWED_CITIZEN_ID") VALUES
(1,2),(1,3),(2,3),(4,1),(5,2);

INSERT INTO "Posts" ("POST_ID","CITIZEN_ID","CONTENT","POST_DATE") VALUES
(1,2,'Hello World','2901-01-01'),
(2,3,'First post','2901-01-02'),
(3,2,'Another one','2901-01-03');

INSERT INTO "Divisions" ("DIVISION_ID","DIVISION_NAME","CHIEF_ID") VALUES
(1,'Recon',101),
(2,'Intel',NULL),
(3,'Field',103),
(4,'Tech',999);

INSERT INTO "DivisionAgents" ("AGENT_ID","AGENT_NAME") VALUES
(101,'Zara'),
(103,'Nova');

INSERT INTO "OperativeStatus" ("OPERATIVE_ID","OPERATIVE_NAME","DIVISION","ENERGY_LEVEL","LAST_MISSION_DATE") VALUES
(1,'Zara','Recon',75,'2901-01-01'),
(2,'Marcus','Intel',32,'2901-01-01'),
(3,'Nova','Field',48,'2901-01-02'),
(4,'Ryn','Tech',15,'2901-01-02'),
(5,'Echo','Recon',89,'2901-01-03');

INSERT INTO "CreditTransactions" ("TRANSACTION_ID","SENDER_NAME","RECEIVER_NAME","BASE_VALUE","MULTIPLIER") VALUES
(1,'Vex','Nova',100,3),
(2,'Echo','Ryn',200,4),
(3,'Zara','Marcus',50,5),
(4,'Nova','Echo',150,2),
(5,'Ryn','Zara',300,3);

INSERT INTO "SectorStats" ("SECTOR_ID","SECTOR","POPULATION","THREAT_LEVEL","COMMANDER","ESTABLISHED") VALUES
(1,'Alpha',12000,'Low','Vex',2850),
(2,'Beta',8500,'High','Nova',2860),
(3,'Gamma',15000,'Medium','Echo',2840),
(4,'Delta',3200,'Critical','Ryn',2870),
(5,'Epsilon',9800,'Low','Zara',2855),
(6,'Zeta',6100,'High','Marcus',2865);

INSERT INTO "MissionLogs" ("MISSION_ID","AGENT_NAME","MISSION_TYPE","SUCCESS","DURATION_HRS","MISSION_DATE","SECTOR") VALUES
(1,'Zara','Recon',1,4,'2901-01-01','Alpha'),
(2,'Marcus','Combat',0,8,'2901-01-02','Beta'),
(3,'Nova','Recon',1,3,'2901-01-03','Alpha'),
(4,'Ryn','Extraction',1,6,'2901-01-04','Delta'),
(5,'Zara','Combat',1,10,'2901-01-05','Beta'),
(6,'Echo','Recon',0,2,'2901-01-06','Gamma'),
(7,'Marcus','Extraction',1,5,'2901-01-07','Alpha'),
(8,'Nova','Combat',1,9,'2901-01-08','Delta'),
(9,'Ryn','Recon',0,3,'2901-01-09','Gamma'),
(10,'Zara','Extraction',1,7,'2901-01-10','Beta'),
(11,'Echo','Combat',1,11,'2901-01-11','Alpha'),
(12,'Vex','Recon',1,4,'2901-01-12','Delta');

INSERT INTO "AgentSkills" ("AGENT_ID","AGENT_NAME","SKILL","PROFICIENCY","CERTIFIED") VALUES
(1,'Zara','Hacking',90,1),
(1,'Zara','Combat',75,1),
(2,'Marcus','Hacking',60,0),
(2,'Marcus','Stealth',85,1),
(3,'Nova','Combat',95,1),
(3,'Nova','Stealth',70,1),
(4,'Ryn','Hacking',88,1),
(4,'Ryn','Analysis',92,1),
(5,'Echo','Analysis',78,0),
(5,'Echo','Stealth',55,0),
(6,'Vex','Combat',88,1),
(6,'Vex','Analysis',65,0);

INSERT INTO "DataVaultInventory" ("ITEM_ID","ITEM_NAME","CATEGORY","QUANTITY","UNIT_COST","LAST_RESTOCKED") VALUES
(1,'Plasma Core','Weapon',5,2000,'2900-12-01'),
(2,'Shield Matrix','Defense',12,1500,'2900-11-15'),
(3,'Neural Chip','Tech',30,800,'2901-01-01'),
(4,'Stealth Suit','Gear',8,3500,'2900-10-20'),
(5,'EMP Device','Weapon',3,4000,'2900-09-05'),
(6,'Med Pack','Medical',50,200,'2901-01-10'),
(7,'Holo Lens','Tech',15,1200,'2900-12-20'),
(8,'Null Grenade','Weapon',2,5000,'2900-08-01'),
(9,'Crypto Key','Tech',100,50,'2901-01-05'),
(10,'Pulse Rifle','Weapon',7,6000,'2900-11-01');

INSERT INTO "AgentRankHistory" ("HISTORY_ID","AGENT_NAME","RANK","FROM_DATE","TO_DATE") VALUES
(1,'Zara','Operative','2895-01-01','2897-06-30'),
(2,'Zara','Senior','2897-07-01','2899-12-31'),
(3,'Zara','Commander','2900-01-01',NULL),
(4,'Marcus','Operative','2896-03-01','2899-02-28'),
(5,'Marcus','Senior','2899-03-01',NULL),
(6,'Nova','Recruit','2898-06-01','2899-05-31'),
(7,'Nova','Operative','2899-06-01',NULL),
(8,'Ryn','Recruit','2900-01-01','2900-12-31'),
(9,'Ryn','Operative','2901-01-01',NULL),
(10,'Echo','Operative','2897-01-01',NULL);

INSERT INTO "ThreatAlerts" ("ALERT_ID","SECTOR","THREAT_TYPE","SEVERITY","REPORTED_AT","RESOLVED") VALUES
(1,'Alpha','Infiltration','High','2901-01-01 08:00',1),
(2,'Beta','Data Breach','Critical','2901-01-01 12:00',0),
(3,'Gamma','Infiltration','Medium','2901-01-02 09:00',1),
(4,'Delta','Signal Jam','Low','2901-01-02 14:00',1),
(5,'Alpha','Data Breach','Critical','2901-01-03 07:00',0),
(6,'Beta','Infiltration','High','2901-01-03 11:00',0),
(7,'Epsilon','Signal Jam','Medium','2901-01-04 10:00',1),
(8,'Zeta','Data Breach','High','2901-01-05 16:00',0);

INSERT INTO "CitizenRegistry" ("CITIZEN_ID","CITIZEN_NAME","SECTOR","REGISTRATION_DATE") VALUES
(1,'Vex','Alpha','2901-01-01'),
(2,'Nova','Beta','2901-01-01'),
(3,'Echo','Gamma','2901-01-02'),
(4,'Ryn','Alpha','2901-01-02');

INSERT INTO "SectorStatus" ("SECTOR_ID","SECTOR_NAME","STABILITY_INDEX","POPULATION","LAST_SCAN_DATE") VALUES
(1,'Alpha Core',95,50000,'2901-01-01'),
(2,'Beta Rim',45,30000,'2901-01-01'),
(3,'Gamma Void',78,25000,'2901-01-02'),
(4,'Delta Edge',62,40000,'2901-01-02'),
(5,'Omega Hub',70,35000,'2901-01-03');

INSERT INTO "AnomalyTracker" ("ANOMALY_ID","ANOMALY_NAME","SECTOR","SEVERITY_SCORE","DETECTED_DATE") VALUES
(1,'Time Loop Alpha','Sector 7',85,'2901-01-01'),
(2,'Reality Fracture','Sector 3',92,'2901-01-02'),
(3,'Echo Storm','Sector 5',67,'2901-01-02'),
(4,'Null Void','Sector 9',99,'2901-01-03'),
(5,'Data Corruption','Sector 1',73,'2901-01-03'),
(6,'Paradox Rift','Sector 4',88,'2901-01-04');

INSERT INTO "BriefingLog" ("LOG_ID","AGENT_NAME","TEAM_SIZE","BRIEFING_DATE") VALUES
(1,'Zara',1,'2901-01-01'),
(2,'Marcus',2,'2901-01-01'),
(3,'Zara',1,'2901-01-05'),
(4,'Nova',1,'2901-01-02'),
(5,'Marcus',1,'2901-01-06'),
(6,'Nova',1,'2901-01-08');

INSERT INTO "ArchiveAccess" ("AGENT_ID","AGENT_NAME","ARCHIVE_ID","ARCHIVE_NAME") VALUES
(1,'Zara',101,'Project Starfall'),
(2,'Marcus',101,'Project Starfall'),
(3,'Nova',102,'Echo Protocol'),
(1,'Zara',103,'Void Manifest'),
(2,'Marcus',103,'Void Manifest'),
(3,'Nova',103,'Void Manifest'),
(4,'Ryn',104,'Shadow Index');

INSERT INTO "Sectors" ("SECTOR_ID","SECTOR_NAME") VALUES
(1,'Alpha Core'),
(2,'Beta Rim'),
(3,'Gamma Void'),
(4,'Delta Edge');

INSERT INTO "Assignments" ("AGENT_ID","SECTOR_ID") VALUES
(101,1),
(102,1),
(103,3);

INSERT INTO "CafeOrders" ("ORDER_ID","CITIZEN_ID","DRINK","ORDER_TIME") VALUES
(1,101,'Quantum Latte','2901-01-01 09:15:00'),
(2,101,'Quantum Latte','2901-01-01 09:45:00'),
(3,102,'Nebula Mocha','2901-01-01 10:00:00'),
(4,102,'Void Espresso','2901-01-01 10:30:00'),
(5,103,'Star Brew','2901-01-01 14:00:00'),
(6,103,'Star Brew','2901-01-01 15:00:00'),
(7,104,'Rift Cap','2901-01-01 11:10:00'),
(8,104,'Rift Cap','2901-01-01 11:55:00');

INSERT INTO "TrainingScores" ("SESSION_ID","AGENT_NAME","SESSION_DATE","POINTS") VALUES
(1,'Zara','2901-01-01',500),
(2,'Marcus','2901-01-01',200),
(3,'Nova','2901-01-01',600),
(4,'Ryn','2901-01-02',400),
(5,'Echo','2901-01-02',150),
(6,'Vex','2901-01-03',300);

INSERT INTO "YearlyCredits" ("YEAR","TOTAL_CREDITS") VALUES
(2898,10000),
(2899,12000),
(2900,15000),
(2901,18000);

COMMIT;
