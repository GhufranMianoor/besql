'use strict';
/* SQL engine is loaded from js/core/sql-engine.js */

/* ══════════════════════════════════════════════════════════
   PROBLEMS DATA
══════════════════════════════════════════════════════════ */
const PROBLEMS_DEFAULT = [
  {
    id:'p1',code:'BSQ-001',title:'High Salary Filter',difficulty:'Easy',points:100,timeLimit:300,
    category:'Filtering',tags:['WHERE','ORDER BY'],
    description:'Find all employees with a salary greater than $85,000.\n\nReturn the columns: name, salary, level.\nOrder results by salary in descending order.',
    sampleOutput:{columns:['name','salary','level'],rows:[['Henry Zhao','115000','Staff'],['Carol White','110000','Staff'],['Frank Kim','105000','Senior']]},
    schemaHint:{table:'employees',columns:[['id','INT'],['name','VARCHAR'],['dept_id','INT'],['salary','INT'],['hire_year','INT'],['age','INT'],['level','VARCHAR']]},
    testCases:[
      {id:'tc1',name:'Row Count',desc:'Must return exactly 6 rows',validate:r=>r.rowCount===6,hint:'WHERE salary > 85000',hidden:true},
      {id:'tc2',name:'Salary Filter',desc:'All returned salaries must be > 85000',validate:r=>{const i=r.columns.findIndex(c=>c.toLowerCase()==='salary');return r.rows.every(row=>Number(row[i])>85000);},hint:'Check your WHERE condition',hidden:true},
      {id:'tc3',name:'Ordered Descending',desc:'Must be ordered by salary DESC',validate:r=>{const i=r.columns.findIndex(c=>c.toLowerCase()==='salary');for(let x=1;x<r.rows.length;x++)if(Number(r.rows[x][i])>Number(r.rows[x-1][i]))return false;return true;},hint:'Add ORDER BY salary DESC',hidden:true},
      {id:'tc4',name:'Correct Columns',desc:'Must return name, salary, and level columns',validate:r=>r.columns.length===3&&r.columns.includes('name')&&r.columns.includes('salary')&&r.columns.includes('level'),hint:'Check your SELECT statement',hidden:true},
      {id:'tc5',name:'Top Earner',desc:'The first row should be Henry Zhao',validate:r=>r.rows[0][r.columns.indexOf('name')]==='Henry Zhao',hint:'Is your data ordered correctly?',hidden:true},
    ],
    solution:'SELECT name, salary, level FROM employees WHERE salary > 85000 ORDER BY salary DESC',
    dailyDate:getTodayStr(),
  },
  {
    id:'p2',code:'BSQ-002',title:'Department Employee Count',difficulty:'Easy',points:150,timeLimit:300,
    category:'Aggregation',tags:['GROUP BY','COUNT'],
    description:'Count the number of employees in each department.\n\nReturn the columns: dept_id, total_employees.\nOrder results by total_employees in descending order.',
    sampleOutput:{columns:['dept_id','total_employees'],rows:[['1','3'],['2','3'],['3','2'],['4','2']]},
    schemaHint:{table:'employees',columns:[['id','INT'],['name','VARCHAR'],['dept_id','INT'],['salary','INT']]},
    testCases:[
      {id:'tc1',name:'Row Count',desc:'Must return a row for each department',validate:r=>r.rowCount===4,hint:'Ensure you are grouping by department',hidden:true},
      {id:'tc2',name:'Correct Columns',desc:'Must return dept_id and total_employees',validate:r=>r.columns.length===2&&r.columns.includes('dept_id')&&r.columns.includes('total_employees'),hint:'Check your SELECT statement and aliases',hidden:true},
      {id:'tc3',name:'Engineering Count',desc:'Engineering department (ID 1) should have 3 employees',validate:r=>{const iDept=r.columns.indexOf('dept_id');const iCount=r.columns.indexOf('total_employees');return r.rows.some(row=>row[iDept]==1&&row[iCount]==3);},hint:'Check your COUNT aggregation',hidden:true},
      {id:'tc4',name:'Marketing Count',desc:'Marketing department (ID 2) should have 3 employees',validate:r=>{const iDept=r.columns.indexOf('dept_id');const iCount=r.columns.indexOf('total_employees');return r.rows.some(row=>row[iDept]==2&&row[iCount]==3);},hint:'Check your COUNT aggregation',hidden:true},
      {id:'tc5',name:'Order Descending',desc:'Results must be ordered by total_employees DESC',validate:r=>{const i=r.columns.indexOf('total_employees');for(let x=1;x<r.rows.length;x++)if(Number(r.rows[x][i])>Number(r.rows[x-1][i]))return false;return true;},hint:'Add ORDER BY total_employees DESC',hidden:true},
    ],
    solution:'SELECT dept_id, COUNT(*) as total_employees FROM employees GROUP BY dept_id ORDER BY total_employees DESC',
    dailyDate:null,
  },
  {
    id:'p4',code:'BSQ-004',title:'Average Salary by Department',difficulty:'Medium',points:200,timeLimit:null,
    category:'Aggregation',tags:['GROUP BY','AVG','HAVING'],
    description:'Show dept_id and average salary (as avg_salary).\nOnly departments with avg salary > $80,000.\nOrder by avg_salary DESC.',
    sampleOutput:{columns:['dept_id','avg_salary'],rows:[['1','101333.33'],['3','96500'],['4','96500']]},
    schemaHint:{table:'employees',columns:[['id','INT'],['name','VARCHAR'],['dept_id','INT'],['salary','INT'],['hire_year','INT'],['age','INT'],['level','VARCHAR']]},
    testCases:[
      {id:'tc1',name:'HAVING filter',desc:'Only depts with avg > 80000',
       validate:r=>{const ai=r.columns.findIndex(c=>c.toLowerCase().includes('avg'));if(ai<0)return false;if(r.rowCount!==3)return false;return r.rows.every(row=>Number(row[ai])>80000);},hint:'HAVING AVG(salary) > 80000'},
      {id:'tc2',name:'Ordered DESC',desc:'Highest average first',
       validate:r=>{const ai=r.columns.findIndex(c=>c.toLowerCase().includes('avg'));if(ai<0)return false;if(r.rowCount<1)return false;for(let i=1;i<r.rows.length;i++)if(Number(r.rows[i][ai])>Number(r.rows[i-1][ai]))return false;return true;},hint:'ORDER BY avg_salary DESC'},
    ],
    solution:'SELECT dept_id, AVG(salary) AS avg_salary FROM employees GROUP BY dept_id HAVING AVG(salary) > 80000 ORDER BY avg_salary DESC',
    dailyDate: null,
  },
  {
    id:'p5',code:'BSQ-005',title:'Top 3 Earners',difficulty:'Easy',points:100,timeLimit:null,
    category:'Filtering',tags:['ORDER BY','LIMIT'],
    description:'Find the top 3 highest paid employees.\nReturn: name, salary only.',
    sampleOutput:{columns:['name','salary'],rows:[['Henry Zhao','115000'],['Carol White','110000'],['Frank Kim','105000']]},
    schemaHint:{table:'employees',columns:[['id','INT'],['name','VARCHAR'],['dept_id','INT'],['salary','INT'],['hire_year','INT'],['age','INT'],['level','VARCHAR']]},
    testCases:[
      {id:'tc1',name:'Exactly 3 rows',desc:'Must return exactly 3 rows',
       validate:r=>r.rowCount===3,hint:'Use LIMIT 3'},
      {id:'tc2',name:'Descending salary',desc:'Highest salary first',
       validate:r=>{const si=r.columns.findIndex(c=>c.toLowerCase().includes('salary'));if(si<0)return false;return Number(r.rows[0][si])>=Number(r.rows[1][si])&&Number(r.rows[1][si])>=Number(r.rows[2][si]);},hint:'ORDER BY salary DESC'},
    ],
    solution:'SELECT name, salary FROM employees ORDER BY salary DESC LIMIT 3',
    dailyDate: null,
  },
  {
    id:'p6',code:'BSQ-006',title:'Revenue by Customer',difficulty:'Medium',points:250,timeLimit:null,
    category:'Aggregation',tags:['GROUP BY','SUM','WHERE'],
    description:'Calculate total revenue for each customer (delivered orders only).\nReturn: customer, total_revenue ordered by total_revenue DESC.',
    sampleOutput:{columns:['customer','total_revenue'],rows:[['GlobalCo','46600'],['MegaRetail','19800'],['TechCorp','18200'],['StartupXYZ','9900']]},
    schemaHint:{table:'orders',columns:[['id','INT'],['customer','VARCHAR'],['product_id','INT'],['amount','INT'],['status','VARCHAR'],['month','VARCHAR']]},
    testCases:[
      {id:'tc1',name:'Delivered only',desc:'Only count delivered orders',
       validate:r=>r.rowCount===4,hint:"WHERE status = 'delivered'"},
      {id:'tc2',name:'SUM column',desc:'Revenue column must exist',
       validate:r=>r.columns.some(c=>c.toLowerCase().includes('rev')||c.toLowerCase().includes('total')||c.toLowerCase().includes('amount')),hint:'SUM(amount) AS total_revenue'},
      {id:'tc3',name:'Descending order',desc:'Highest revenue first',
       validate:r=>{const ri=r.columns.findIndex(c=>c.toLowerCase().includes('rev')||c.toLowerCase().includes('total'));if(ri<0)return false;for(let i=1;i<r.rows.length;i++)if(Number(r.rows[i][ri])>Number(r.rows[i-1][ri]))return false;return true;},hint:'ORDER BY total_revenue DESC'},
    ],
    solution:"SELECT customer, SUM(amount) AS total_revenue FROM orders WHERE status = 'delivered' GROUP BY customer ORDER BY total_revenue DESC",
    dailyDate: null,
  },
  {
    id:'p7',code:'BSQ-007',title:'Product Order Report',difficulty:'Hard',points:350,timeLimit:null,
    category:'Joins',tags:['JOIN','GROUP BY','SUM'],
    description:'For each product: return name (as product), order count, and total revenue generated.\nOrder by total_revenue DESC.',
    sampleOutput:{columns:['product','order_count','total_revenue'],rows:[['Enterprise Suite','5','65800'],['Analytics Pro','3','38000'],['Consulting Pack','2','6300']]},
    schemaHint:{table:'orders  ·  products',columns:[['orders.id','INT'],['orders.customer','VARCHAR'],['orders.product_id','INT'],['orders.amount','INT'],['orders.status','VARCHAR'],['products.id','INT'],['products.name','VARCHAR'],['products.category','VARCHAR'],['products.price','INT']]},
    testCases:[
      {id:'tc1',name:'Three products',desc:'Must return 3 rows',
       validate:r=>r.rowCount===3,hint:'JOIN products ON product_id = products.id'},
      {id:'tc2',name:'order_count column',desc:'Must have order count',
       validate:r=>r.columns.some(c=>c.toLowerCase().includes('count')||c.toLowerCase().includes('order')),hint:'COUNT(*) AS order_count'},
      {id:'tc3',name:'Descending by revenue',desc:'Highest revenue first',
       validate:r=>{const ri=r.columns.findIndex(c=>c.toLowerCase().includes('rev')||c.toLowerCase().includes('total'));if(ri<0)return false;for(let i=1;i<r.rows.length;i++)if(Number(r.rows[i][ri])>Number(r.rows[i-1][ri]))return false;return true;},hint:'ORDER BY total_revenue DESC'},
    ],
    solution:'SELECT p.name AS product, COUNT(*) AS order_count, SUM(o.amount) AS total_revenue FROM orders o JOIN products p ON o.product_id = p.id GROUP BY p.name ORDER BY total_revenue DESC',
    dailyDate: null,
  },
  {
    id:'p8',code:'BSQ-008',title:'Student GPA Report',difficulty:'Hard',points:300,timeLimit:null,
    category:'Joins',tags:['JOIN','AVG','GROUP BY'],
    description:'For each course: return course name (as course_name), enrolled student count, and average GPA.\nOrder by avg_gpa DESC.',
    sampleOutput:{columns:['course_name','enrolled','avg_gpa'],rows:[['Machine Learning','2','3.75'],['Data Structures','2','3.35'],['Database Systems','2','3.35']]},
    schemaHint:{table:'students  ·  courses',columns:[['students.id','INT'],['students.name','VARCHAR'],['students.grade','INT'],['students.course_id','INT'],['students.year','INT'],['students.gpa','FLOAT'],['courses.id','INT'],['courses.name','VARCHAR'],['courses.credits','INT'],['courses.instructor','VARCHAR']]},
    testCases:[
      {id:'tc1',name:'Three courses',desc:'Must return 3 rows',
       validate:r=>r.rowCount===3,hint:'JOIN courses ON course_id = courses.id'},
      {id:'tc2',name:'avg_gpa column',desc:'Must compute average GPA',
       validate:r=>r.columns.some(c=>c.toLowerCase().includes('gpa')||c.toLowerCase().includes('avg')),hint:'AVG(gpa) AS avg_gpa'},
    ],
    solution:'SELECT c.name AS course_name, COUNT(*) AS enrolled, AVG(s.gpa) AS avg_gpa FROM students s JOIN courses c ON s.course_id = c.id GROUP BY c.name ORDER BY avg_gpa DESC',
    dailyDate: null,
  },
  {
    id:'p9',code:'BSQ-009',title:'Danger Zone Citizens',difficulty:'Easy',points:180,timeLimit:null,
    category:'Filtering',tags:['WHERE','ORDER BY'],
    description:'Find citizens with stability rating below 2.0.\nReturn: citizen_name, sector, stability_rating ordered by stability_rating ASC.',
    sampleOutput:{columns:['citizen_name','sector','stability_rating'],rows:[['Ryn','Delta','0.8'],['Nova','Beta','1.5'],['Marcus','Beta','1.9']]},
    schemaHint:{table:'citizenmentalhealth',columns:[['citizen_id','INT'],['citizen_name','VARCHAR'],['sector','VARCHAR'],['stability_rating','FLOAT'],['last_checkup','DATE']]},
    testCases:[
      {id:'tc1',name:'Low stability only',desc:'All rows must be below 2.0',validate:r=>{const i=r.columns.findIndex(c=>c.toLowerCase().includes('stability'));return i>=0&&r.rows.every(row=>Number(row[i])<2);},hint:'WHERE stability_rating < 2.0'},
      {id:'tc2',name:'Three citizens',desc:'Must return exactly 3 rows',validate:r=>r.rowCount===3,hint:'Ryn, Nova, and Marcus'},
      {id:'tc3',name:'Ascending order',desc:'Lowest stability first',validate:r=>{const i=r.columns.findIndex(c=>c.toLowerCase().includes('stability'));if(i<0)return false;for(let x=1;x<r.rows.length;x++)if(Number(r.rows[x][i])<Number(r.rows[x-1][i]))return false;return true;},hint:'ORDER BY stability_rating ASC'},
    ],
    solution:'SELECT citizen_name, sector, stability_rating FROM citizenmentalhealth WHERE stability_rating < 2.0 ORDER BY stability_rating ASC',
    dailyDate: null,
  },
  {
    id:'p10',code:'BSQ-010',title:'Double Agents',difficulty:'Medium',points:220,timeLimit:null,
    category:'Filtering',tags:['WHERE','ORDER BY'],
    description:'List Alpha clearance operatives with multiple organizations (count > 1).\nReturn: operative_name, organizations_count ordered by count DESC.',
    sampleOutput:{columns:['operative_name','organizations_count'],rows:[['Zara','3'],['Ryn','2']]},
    schemaHint:{table:'operativeprofiles',columns:[['operative_id','INT'],['operative_name','VARCHAR'],['clearance_level','VARCHAR'],['organizations_count','INT'],['recruitment_date','DATE']]},
    testCases:[
      {id:'tc1',name:'Alpha multiorg only',desc:'Only Alpha with organizations_count > 1',validate:r=>r.rowCount===2,hint:'WHERE clearance_level = \'Alpha\' AND organizations_count > 1'},
      {id:'tc2',name:'Zara and Ryn only',desc:'Must include both Zara and Ryn',validate:r=>{const n=r.rows.map(row=>String(row[0]).toLowerCase());return n.includes('zara')&&n.includes('ryn');},hint:'These are the only Alpha operatives with multiple orgs'},
      {id:'tc3',name:'Descending count',desc:'Highest org count first',validate:r=>{const i=r.columns.findIndex(c=>c.toLowerCase().includes('count'));if(i<0)return false;for(let x=1;x<r.rows.length;x++)if(Number(r.rows[x][i])>Number(r.rows[x-1][i]))return false;return true;},hint:'ORDER BY organizations_count DESC'},
    ],
    solution:"SELECT operative_name, organizations_count FROM operativeprofiles WHERE clearance_level = 'Alpha' AND organizations_count > 1 ORDER BY organizations_count DESC",
    dailyDate: null,
  },
  {
    id:'p11',code:'BSQ-011',title:'Duplicate Records',difficulty:'Medium',points:240,timeLimit:null,
    category:'Aggregation',tags:['GROUP BY','HAVING','COUNT'],
    description:'Find duplicate agent/division entries.\nReturn: agent_name, division_name, duplicate_count (count > 1) ordered DESC.',
    sampleOutput:{columns:['agent_name','division_name','duplicate_count'],rows:[['Nova','Field','3'],['Zara','Recon','2']]},
    schemaHint:{table:'agentrecords',columns:[['record_id','INT'],['agent_name','VARCHAR'],['division_name','VARCHAR'],['entry_date','DATE']]},
    testCases:[
      {id:'tc1',name:'Duplicates only',desc:'Must return exactly duplicated groups',validate:r=>r.rowCount===2,hint:'GROUP BY agent_name, division_name HAVING COUNT(*) > 1'},
      {id:'tc2',name:'Has count column',desc:'Must include a count column',validate:r=>r.columns.some(c=>c.toLowerCase().includes('count')||c.toLowerCase().includes('dup')),hint:'Use COUNT(*) in SELECT'},
      {id:'tc3',name:'Descending order',desc:'Highest duplicates first',validate:r=>{const i=r.columns.findIndex(c=>c.toLowerCase().includes('count'));if(i<0)return false;for(let x=1;x<r.rows.length;x++)if(Number(r.rows[x][i])>Number(r.rows[x-1][i]))return false;return true;},hint:'ORDER BY duplicate_count DESC'},
    ],
    solution:'SELECT agent_name, division_name, COUNT(*) AS duplicate_count FROM agentrecords GROUP BY agent_name, division_name HAVING COUNT(*) > 1 ORDER BY duplicate_count DESC, agent_name ASC',
    dailyDate: null,
  },
  {
    id:'p12',code:'BSQ-012',title:'Echo Transactions',difficulty:'Medium',points:250,timeLimit:null,
    category:'Aggregation',tags:['SUM','GROUP BY','HAVING'],
    description:'Show accounts whose total credits exceed 400.\n\nReturn: account_id, total_credits ordered by total_credits descending.',
    sampleOutput:{columns:['account_id','total_credits'],rows:[['101','700'],['102','450'],['103','500']]},
    schemaHint:{table:'creditledger',columns:[['txn_id','INT'],['account_id','INT'],['credits','INT'],['txn_date','DATE']]},
    testCases:[
      {id:'tc1',name:'High value accounts',desc:'Only accounts with SUM(credits) > 400',validate:r=>r.rowCount===3,hint:'HAVING SUM(credits) > 400'},
      {id:'tc2',name:'All above threshold',desc:'All totals must exceed 400',validate:r=>{const i=r.columns.findIndex(c=>c.toLowerCase().includes('total'));return i>=0&&r.rows.every(row=>Number(row[i])>400);},hint:'Check your HAVING condition'},
      {id:'tc3',name:'Descending sort',desc:'Highest total first',validate:r=>{const i=r.columns.findIndex(c=>c.toLowerCase().includes('total'));if(i<0)return false;for(let x=1;x<r.rows.length;x++)if(Number(r.rows[x][i])<Number(r.rows[x-1][i]))return false;return true;},hint:'ORDER BY total_credits DESC'},
    ],
    solution:'SELECT account_id, SUM(credits) AS total_credits FROM creditledger GROUP BY account_id HAVING SUM(credits) > 400 ORDER BY total_credits DESC',
    dailyDate: null,
  },
  {
    id:'p13',code:'BSQ-013',title:'Exchange Paradox',difficulty:'Hard',points:320,timeLimit:null,
    category:'Joins',tags:['JOIN','IN'],
    description:'Find agents who have appeared as both giver and receiver in exchanges.\n\nReturn: agent_name ordered alphabetically.',
    sampleOutput:{columns:['agent_name'],rows:[['Marcus'],['Nova'],['Zara']]},
    schemaHint:{table:'agents  ·  exchanges',columns:[['agent_id','INT'],['agent_name','VARCHAR'],['giver_id','INT'],['receiver_id','INT'],['year','INT']]},
    testCases:[
      {id:'tc1',name:'Bidirectional participants',desc:'Must include agents appearing in both roles',validate:r=>r.rowCount===3,hint:'agent_id IN (SELECT giver_id ...) AND agent_id IN (SELECT receiver_id ...)'},
      {id:'tc2',name:'Three agents',desc:'Marcus, Nova, Zara',validate:r=>{const names=r.rows.map(row=>String(row[0]).toLowerCase());return names.length===3;},hint:'Use IN with two subqueries'},
      {id:'tc3',name:'Alphabetical order',desc:'Names A-Z',validate:r=>{for(let x=1;x<r.rows.length;x++)if(String(r.rows[x][0]).toLowerCase()<String(r.rows[x-1][0]).toLowerCase())return false;return true;},hint:'ORDER BY agent_name ASC'},
    ],
    solution:'SELECT a.agent_name FROM agents a WHERE a.agent_id IN (SELECT giver_id FROM exchanges) AND a.agent_id IN (SELECT receiver_id FROM exchanges) ORDER BY a.agent_name ASC',
    dailyDate: null,
  },
  {
    id:'p14',code:'BSQ-014',title:'Ghost Followers',difficulty:'Hard',points:330,timeLimit:null,
    category:'Joins',tags:['LEFT JOIN','NULL'],
    description:'Find citizens who follow someone but have never posted.\n\nReturn distinct citizen_id ordered ascending.',
    sampleOutput:{columns:['citizen_id'],rows:[['1'],['4'],['5']]},
    schemaHint:{table:'follows  ·  posts',columns:[['citizen_id','INT'],['followed_citizen_id','INT'],['post_id','INT'],['content','VARCHAR']]},
    testCases:[
      {id:'tc1',name:'No-post followers',desc:'Only followers with no posts',validate:r=>r.rowCount===3,hint:'LEFT JOIN posts ON follows.citizen_id = posts.citizen_id WHERE posts.citizen_id IS NULL'},
      {id:'tc2',name:'Three citizens',desc:'Citizens 1, 4, and 5',validate:r=>{const ids=r.rows.map(row=>String(row[0]));return ids.includes('1')&&ids.includes('4')&&ids.includes('5');},hint:'These follow but never posted'},
      {id:'tc3',name:'Ascending order',desc:'IDs ordered low to high',validate:r=>{for(let x=1;x<r.rows.length;x++)if(Number(r.rows[x][0])<Number(r.rows[x-1][0]))return false;return true;},hint:'ORDER BY citizen_id ASC'},
    ],
    solution:'SELECT DISTINCT f.citizen_id FROM follows f LEFT JOIN posts p ON f.citizen_id = p.citizen_id WHERE p.citizen_id IS NULL ORDER BY f.citizen_id ASC',
    dailyDate: null,
  },
  {
    id:'p15',code:'BSQ-015',title:'Leaderless Divisions',difficulty:'Medium',points:260,timeLimit:null,
    category:'Joins',tags:['LEFT JOIN','NULL','OR'],
    description:'Find divisions with missing or invalid chiefs (NULL or non-existent in divisionagents).\nReturn: division_name ordered alphabetically.',
    sampleOutput:{columns:['division_name'],rows:[['Intel'],['Tech']]},
    schemaHint:{table:'divisions  ·  divisionagents',columns:[['division_id','INT'],['division_name','VARCHAR'],['chief_id','INT'],['agent_id','INT']]},
    testCases:[
      {id:'tc1',name:'Leaderless only',desc:'Must return Intel and Tech',validate:r=>r.rowCount===2,hint:'LEFT JOIN divisionagents ON chief_id = agent_id'},
      {id:'tc2',name:'Intel and Tech only',desc:'Must include both divisions',validate:r=>{const names=r.rows.map(row=>String(row[0]).toLowerCase());return names.some(n=>n.includes('intel'))&&names.some(n=>n.includes('tech'));},hint:'These divisions have no valid leaders'},
      {id:'tc3',name:'Alphabetical order',desc:'Intel before Tech',validate:r=>{const n0=String(r.rows[0][0]).toLowerCase();return n0.includes('intel');},hint:'ORDER BY division_name ASC'},
    ],
    solution:'SELECT d.division_name FROM divisions d LEFT JOIN divisionagents a ON d.chief_id = a.agent_id WHERE d.chief_id IS NULL OR a.agent_id IS NULL ORDER BY d.division_name ASC',
    dailyDate: null,
  },
  {
    id:'p16',code:'BSQ-016',title:'Low-Energy Operatives',difficulty:'Easy',points:170,timeLimit:null,
    category:'Filtering',tags:['WHERE','ORDER BY'],
    description:'List operatives with energy level below 40.\n\nReturn: operative_name, division, energy_level ordered by energy_level ascending.',
    sampleOutput:{columns:['operative_name','division','energy_level'],rows:[['Ryn','Tech','15'],['Marcus','Intel','32']]},
    schemaHint:{table:'operativestatus',columns:[['operative_id','INT'],['operative_name','VARCHAR'],['division','VARCHAR'],['energy_level','INT'],['last_mission_date','DATE']]},
    testCases:[
      {id:'tc1',name:'Energy threshold',desc:'All rows must be < 40',validate:r=>{const i=r.columns.findIndex(c=>c.toLowerCase().includes('energy'));return i>=0&&r.rows.every(row=>Number(row[i])<40);},hint:'WHERE energy_level < 40'},
      {id:'tc2',name:'Two operatives',desc:'Ryn and Marcus only',validate:r=>r.rowCount===2,hint:'The only low-energy operatives'},
      {id:'tc3',name:'Ascending order',desc:'Lowest energy first',validate:r=>{const i=r.columns.findIndex(c=>c.toLowerCase().includes('energy'));if(i<0)return false;for(let x=1;x<r.rows.length;x++)if(Number(r.rows[x][i])<Number(r.rows[x-1][i]))return false;return true;},hint:'ORDER BY energy_level ASC'},
    ],
    solution:'SELECT operative_name, division, energy_level FROM operativestatus WHERE energy_level < 40 ORDER BY energy_level ASC',
    dailyDate: null,
  },
  {
    id:'p17',code:'BSQ-017',title:'Credit Multiplier',difficulty:'Easy',points:190,timeLimit:null,
    category:'Computed Columns',tags:['SELECT','ORDER BY'],
    description:'For each transaction, compute effective credits (base_value * multiplier).\nReturn: sender_name, receiver_name, effective_credits ordered DESC.',
    sampleOutput:{columns:['sender_name','receiver_name','effective_credits'],rows:[['Ryn','Zara','900'],['Echo','Ryn','800'],['Vex','Nova','300']]},
    schemaHint:{table:'credittransactions',columns:[['transaction_id','INT'],['sender_name','VARCHAR'],['receiver_name','VARCHAR'],['base_value','INT'],['multiplier','INT']]},
    testCases:[
      {id:'tc1',name:'Computed field',desc:'Must compute base_value * multiplier',validate:r=>r.rowCount===5,hint:'SELECT base_value * multiplier AS effective_credits'},
      {id:'tc2',name:'Five transactions',desc:'All 5 rows included',validate:r=>r.rowCount===5,hint:'Ryn-Zara, Echo-Ryn, Vex-Nova, and 2 more'},
      {id:'tc3',name:'Descending order',desc:'Highest effective_credits first',validate:r=>{const i=r.columns.findIndex(c=>c.toLowerCase().includes('effective'));if(i<0)return false;for(let x=1;x<r.rows.length;x++)if(Number(r.rows[x][i])>Number(r.rows[x-1][i]))return false;return true;},hint:'ORDER BY effective_credits DESC'},
    ],
    solution:'SELECT sender_name, receiver_name, base_value * multiplier AS effective_credits FROM credittransactions ORDER BY effective_credits DESC',
    dailyDate: null,
  },
];

/* ══════════════════════════════════════════════════════════
   CONTESTS DATA
══════════════════════════════════════════════════════════ */
const CONTESTS_DEFAULT = [];
const REMOVED_CONTEST_IDS = new Set(['con3']);
const REMOVED_CONTEST_TITLES = new Set(['weekend grind']);

function shouldRemoveContest(contest){
  if(!contest)return false;
  const id=String(contest.id||'').trim();
  const title=String(contest.title||'').trim().toLowerCase();
  return REMOVED_CONTEST_IDS.has(id)||REMOVED_CONTEST_TITLES.has(title);
}

function purgeRemovedContestsFromState(){
  const removedIds=[];
  const collect=(arr)=>{
    const next=[];
    for(const contest of arr||[]){
      if(shouldRemoveContest(contest)){
        const cid=String(contest?.id||'').trim();
        if(cid&&!removedIds.includes(cid))removedIds.push(cid);
        continue;
      }
      next.push(contest);
    }
    return next;
  };
  S.contests=collect(S.contests);
  S.customContests=collect(S.customContests);
  return removedIds;
}

const DEFAULT_PROBLEM_BY_ID=Object.fromEntries(PROBLEMS_DEFAULT.map(p=>[String(p.id||''),p]));
const DEFAULT_PROBLEM_BY_CODE=Object.fromEntries(PROBLEMS_DEFAULT.map(p=>[String(p.code||'').toUpperCase(),p]));

/* ══════════════════════════════════════════════════════════
   STATE
══════════════════════════════════════════════════════════ */
const S = {
  user:null,
  problems:[],
  contests:[],
  submissions:[],
  customContests:[],
  scoreboardContestFilter:'all',
  currentView:'home',
  currentContest:null,
  currentProblem:null,
  judgeContext:null, // {contestId, problemId, backView}
  judgeTimer:null,
  judgeElapsed:0,
  onlineCount: Math.floor(Math.random()*120)+320,
  editingProblem:null,
  editingContest:null,
  editingCustomContest:null,
  pendingContestAccess:null,
  adminSubTab:'problems',
  practiceFilter:'All',
  practiceSearch:'',
  adminProblemSearch:'',
  contestProblemSearch:'',
  contestCreatorSearch:'',
  customContestProblemSearch:'',
  practiceLab:{tables:{}},
  judgeSessions:{},
  unlockedPrivateContests:{},
};

/* ══════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════ */
const el=id=>document.getElementById(id);
const esc=s=>{const d=document.createElement('div');d.textContent=String(s??'');return d.innerHTML;};
function normalizeSearchQuery(value){
  return String(value||'')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}
function buildProblemSearchText(problem){
  if(!problem)return '';
  const code=String(problem.code||problem.id||'');
  const compactCode=code.toLowerCase().replace(/[^a-z0-9]+/g,'');
  const parts=[
    code,
    compactCode,
    problem.title||'',
    problem.difficulty||'',
    problem.category||'',
    Array.isArray(problem.tags)?problem.tags.join(' '):'',
    problem.description||'',
  ];
  return normalizeSearchQuery(parts.join(' '));
}
function problemMatchesQuery(problem,query){
  const q=normalizeSearchQuery(query);
  if(!q)return true;
  const scope=buildProblemSearchText(problem);
  if(!scope)return false;
  const compactQ=q.replace(/\s+/g,'');
  const compactScope=scope.replace(/\s+/g,'');
  if(scope.includes(q))return true;
  if(compactQ&&compactScope.includes(compactQ))return true;
  return q.split(' ').every(token=>scope.includes(token));
}
function preserveInputFocusAfterRender(inputId,value,caretPos){
  requestAnimationFrame(()=>{
    const node=el(inputId);
    if(!node)return;
    node.focus();
    if(typeof value==='string'&&node.value!==value)node.value=value;
    const pos=Math.max(0,Math.min(Number.isFinite(caretPos)?caretPos:value.length,node.value.length));
    node.setSelectionRange(pos,pos);
  });
}
function show(id){const e=typeof id==='string'?el(id):id;if(e)e.classList.remove('hidden');}
function hide(id){const e=typeof id==='string'?el(id):id;if(e)e.classList.add('hidden');}
function tog(id,c){c?show(id):hide(id);}
function genId(){return Math.random().toString(36).slice(2,10);}
function fmtN(n){return Number(n).toLocaleString();}
function fmtT(s){return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}
function fmtDate(ts){return new Date(ts).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});}
// Syntax highlighting handled by CodeMirror - removed legacy functions
function fmtCountdownDHMS(totalSeconds){
  const secs=Math.max(0,Math.floor(totalSeconds));
  const days=Math.floor(secs/86400);
  const hours=Math.floor((secs%86400)/3600);
  const mins=Math.floor((secs%3600)/60);
  const seconds=secs%60;
  return `${days}d ${String(hours).padStart(2,'0')}h ${String(mins).padStart(2,'0')}m ${String(seconds).padStart(2,'0')}s`;
}
function fmtDur(ms){const m=Math.floor(ms/60000);const h=Math.floor(m/60);return h?`${h}h ${m%60}m`:`${m}m`;}
function getTodayStr(){const d=new Date();return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;}
function diffCls(d){return d==='Easy'?'diff-easy':d==='Medium'?'diff-med':d==='Hard'?'diff-hard':'diff-expert';}
function roleBadge(role){return `<span class="role-badge rb-${role}">${role}</span>`;}
function getEntryViewOverride(){
  const allowed=new Set(['home','contests','custom','practice','playground','submissions','profile','admin','scoreboards']);
  const fromCore=String(window.__BESQL_ENTRY_VIEW||'').trim().toLowerCase();
  if(allowed.has(fromCore))return fromCore;
  const fromQuery=new URLSearchParams(window.location.search).get('view');
  const fromHash=(window.location.hash||'').replace(/^#\/??/,'').replace(/^view=/,'').trim();
  const raw=(fromQuery||fromHash||'').toLowerCase();
  return allowed.has(raw)?raw:'';
}
function getEntryContestId(){
  const cid=new URLSearchParams(window.location.search).get('contestId');
  return cid?String(cid).trim():'';
}
function isAdmin(){return S.user?.role==='admin';}
function isMaster(){return S.user?.role==='admin'||S.user?.role==='master';}
function isCountableSubmission(sub){
  return Boolean(sub&&sub.isSubmitted===true&&String(sub.code||'').trim());
}
function normalizeSubmissionRecord(sub){
  if(!sub||typeof sub!=='object')return null;
  const normalized={...sub};
  if(normalized.isSubmitted!==true){
    const verdict=String(normalized.verdict||'').toUpperCase();
    const hasCode=String(normalized.code||'').trim().length>0;
    const hasTests=Number(normalized.tcTotal||0)>0;
    const looksLikeSubmitted=hasCode&&hasTests&&['AC','WA','TLE','CE'].includes(verdict);
    normalized.isSubmitted=Boolean(looksLikeSubmitted);
  }
  return normalized;
}
function normalizeSubmissionList(list){
  if(!Array.isArray(list))return [];
  return list.map(normalizeSubmissionRecord).filter(Boolean);
}
function getSolvedIds(){
  return new Set(
    S.submissions
      .filter(s=>isCountableSubmission(s)&&s.verdict==='AC')
      .map(s=>s.problemId)
  );
}
function calculateBonusFromTimeTaken(seconds){
  const t=Math.max(0,Number(seconds||0));
  if(t<60)return 50;
  if(t<120)return 30;
  if(t<300)return 10;
  return 0;
}
function recomputeCurrentUserStatsFromSubmissions(){
  if(!S.user?.username)return;
  const subs=(Array.isArray(S.submissions)?S.submissions:[])
    .filter(isCountableSubmission)
    .filter(s=>String(s.userId||'')===String(S.user.userId||''))
    .sort((a,b)=>Number(a.at||0)-Number(b.at||0));
  const seenProblems=new Set();
  let solved=0;
  let score=0;
  for(const sub of subs){
    if(sub?.verdict!=='AC')continue;
    const pid=String(sub.problemId||'');
    if(!pid||seenProblems.has(pid))continue;
    seenProblems.add(pid);
    solved+=1;
    const p=S.problems.find(x=>String(x.id||'')===pid);
    const base=Number(p?.points||sub.dbScore||0);
    score+=Math.max(0,base)+calculateBonusFromTimeTaken(sub.timeTaken);
  }
  S.user.solved=solved;
  S.user.score=score;
  LS.set(`user:${S.user.username}`,S.user);
}
function hasContestStarted(contest){
  return Date.now()>=Number(contest?.startTime||0);
}
function getContestSelectableProblems(existingProblemIds=[]){
  if(isAdmin())return [...S.problems];
  const keep=new Set(Array.isArray(existingProblemIds)?existingProblemIds:[]);
  return S.problems.filter(p=>p.isCustom!==true||keep.has(p.id));
}
function isSolvedInContest(problemId,contestId){
  if(!problemId||!contestId)return false;
  return S.submissions.some(s=>isCountableSubmission(s)&&s.problemId===problemId&&s.contestId===contestId&&s.verdict==='AC');
}
function getSolvedIdsInContest(contestId){
  if(!contestId)return new Set();
  return new Set(
    S.submissions
      .filter(s=>isCountableSubmission(s)&&s.contestId===contestId&&s.verdict==='AC')
      .map(s=>s.problemId)
  );
}
function isSolvedForJudgeContext(problemId,ctx){
  if(ctx?.contestId)return isSolvedInContest(problemId,ctx.contestId);
  return getSolvedIds().has(problemId);
}
function isContestReattemptBlocked(problemId,contestId){
  return Boolean(contestId)&&isSolvedInContest(problemId,contestId);
}
function getEffectiveSubmissionContestId(ctx){
  const contestId=ctx?.contestId||null;
  if(!contestId)return null;
  const contest=getContestById(contestId);
  if(!contest)return null;
  normalizeContestLifecycle(contest);
  if(contest.status==='ended')return null;
  return contest.id;
}
function normalizeBsqCode(raw){
  const code=String(raw||'').trim().toUpperCase();
  return /^BSQ-\d+$/.test(code)?code:'';
}
function getNextBsqCode(){
  const used=S.problems
    .map(p=>normalizeBsqCode(p.code||p.id))
    .filter(Boolean)
    .map(c=>parseInt(c.split('-')[1],10))
    .filter(n=>Number.isFinite(n));
  const next=(used.length?Math.max(...used):0)+1;
  return `BSQ-${String(next).padStart(3,'0')}`;
}

function validateUsername(u){
  if(!u||u.length<3)return 'Username must be at least 3 characters.';
  if(u.length>24)return 'Username must be at most 24 characters.';
  if(!/^[A-Za-z0-9_]+$/.test(u))return 'Username can contain only letters, numbers, and underscore.';
  return '';
}

function validateEmail(email){
  if(!email)return 'Email is required.';
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return 'Enter a valid email address.';
  return '';
}

function validatePassword(p){
  if(!p||p.length<8)return 'Password must be at least 8 characters.';
  if(!/[A-Z]/.test(p))return 'Password must include at least 1 uppercase letter.';
  if(!/[a-z]/.test(p))return 'Password must include at least 1 lowercase letter.';
  if(!/[0-9]/.test(p))return 'Password must include at least 1 number.';
  if(!/[^A-Za-z0-9]/.test(p))return 'Password must include at least 1 special character.';
  return '';
}

async function hashPassword(raw){
  const bytes=new TextEncoder().encode(String(raw||''));
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

function getRoleId(role){
  if(role==='admin')return 1;
  if(role==='master')return 3;
  return 2;
}

async function getRelationalUserId(username){
  if(!SB||STORAGE_MODE!=='supabase'||!username)return null;
  const {data,error}=await SB.from('users').select('id').eq('username',username).maybeSingle();
  if(error)return null;
  return data?.id??null;
}

async function getRoleFromRelationalUserId(userId){
  if(!SB||STORAGE_MODE!=='supabase'||!userId)return 'contestant';
  const {data,error}=await SB.from('user_roles').select('role_id').eq('user_id',userId);
  if(error||!data?.length)return 'contestant';
  const roleIds=data.map(r=>Number(r.role_id));
  if(roleIds.includes(1))return 'admin';
  if(roleIds.includes(3))return 'master';
  return 'contestant';
}

async function fetchRelationalAuthUser(username){
  if(!SB||STORAGE_MODE!=='supabase'||!username)return null;
  const {data,error}=await SB
    .from('users')
    .select('id,username,email,password_hash,is_active,created_at')
    .eq('username',username)
    .maybeSingle();
  if(error||!data||data.is_active===false)return null;
  const role=await getRoleFromRelationalUserId(data.id);
  return {
    userId:`db-${data.id}`,
    username:data.username,
    email:data.email||`${data.username}@besql.local`,
    passwordHash:data.password_hash||'',
    role,
    score:0,
    solved:0,
    joinedAt:data.created_at?new Date(data.created_at).getTime():Date.now(),
  };
}

async function syncUserToRelational(user){
  if(!SB||STORAGE_MODE!=='supabase'||!user?.username){
    return Promise.resolve({success:false,reason:'Supabase not available or user data incomplete'});
  }
  try{
    const {data:existing,error:existingErr}=await SB
      .from('users')
      .select('id,email,password_hash,full_name,is_active')
      .eq('username',user.username)
      .maybeSingle();
    if(existingErr){
      console.warn('Supabase users prefetch failed:',existingErr.message||existingErr);
      return {success:false,error:existingErr.message||existingErr};
    }

    const payload={
      username:user.username,
      updated_at:new Date().toISOString(),
    };

    // Only write fields we actually have, otherwise keep existing values.
    if(user.email)payload.email=user.email;
    else if(existing?.email)payload.email=existing.email;

    if(user.passwordHash)payload.password_hash=user.passwordHash;
    else if(existing?.password_hash)payload.password_hash=existing.password_hash;

    if(user.username)payload.full_name=user.username;
    else if(existing?.full_name)payload.full_name=existing.full_name;

    payload.is_active=existing?.is_active??true;

    if(!payload.email||!payload.password_hash){
      return {success:false,reason:'Missing email or password hash for user sync'};
    }

    const {data,error}=await SB.from('users').upsert(payload,{onConflict:'username'}).select('id').maybeSingle();
    if(error){
      console.warn('Supabase users sync failed:',error.message||error);
      return {success:false,error:error.message||error};
    }
    const userId=data?.id??await getRelationalUserId(user.username);
    if(!userId){
      console.warn('Failed to get user ID after sync');
      return {success:false,reason:'Failed to get user ID'};
    }
    const role_id=getRoleId(user.role);
    const {error:roleErr}=await SB.from('user_roles').upsert({user_id:userId,role_id},{onConflict:'user_id,role_id'});
    if(roleErr){
      console.warn('Supabase user_roles sync failed:',roleErr.message||roleErr);
      return {success:false,error:roleErr.message||roleErr};
    }
    return {success:true,userId};
  }catch(err){
    console.warn('Supabase relational user sync exception:',err?.message||err);
    return {success:false,error:err?.message||err};
  }
}

async function syncSubmissionToRelational(sub,result,problem){
  if(!SB||STORAGE_MODE!=='supabase'||!S.user?.username||!sub){
    return Promise.resolve({success:false,reason:'Supabase not available or submission data incomplete'});
  }
  try{
    const uid=await getRelationalUserId(S.user.username);
    if(!uid){
      console.warn('Failed to get user ID for submission sync');
      return {success:false,reason:'User ID not found'};
    }
    const verdictMap={AC:'accepted',WA:'wrong_answer',TLE:'time_limit',CE:'error'};
    const verdict=verdictMap[sub.verdict]||String(sub.verdict||'pending').toLowerCase();
    const contestIdNum=Number(sub.contestId);
    const payload={
      user_id:uid,
      problem_id:problem?.code||sub.problemId,
      contest_id:Number.isFinite(contestIdNum)?contestIdNum:null,
      submitted_code:sub.code||'',
      verdict,
      error_message:result?.error||(sub.verdict==='WA'?'Wrong Answer':null),
      runtime_ms:Math.max(0,Number(sub.timeTaken||0))*1000,
      memory_mb:null,
      tests_passed:Number(sub.tcPassed||0),
      total_tests:Number(sub.tcTotal||0),
      score:sub.verdict==='AC'?(Number(problem?.points||0)):0,
      judged_at:new Date().toISOString(),
    };
    const {error}=await SB.from('submissions').insert(payload);
    if(error){
      console.warn('Supabase submissions sync failed:',error.message||error);
      return {success:false,error:error.message||error};
    }
    return {success:true};
  }catch(err){
    console.warn('Supabase relational submission sync exception:',err?.message||err);
    return {success:false,error:err?.message||err};
  }
}

function mapRelationalVerdictToLocal(verdict){
  const v=String(verdict||'').trim().toLowerCase();
  if(v==='accepted')return 'AC';
  if(v==='wrong_answer')return 'WA';
  if(v==='time_limit')return 'TLE';
  if(v==='error')return 'CE';
  return String(verdict||'WA').toUpperCase();
}

function mapRelationalProblemIdToLocal(problemId){
  const raw=String(problemId||'').trim();
  if(!raw)return raw;
  const direct=S.problems.find(p=>String(p.id)===raw);
  if(direct)return direct.id;
  const byCode=S.problems.find(p=>String(p.code||'').toLowerCase()===raw.toLowerCase());
  if(byCode)return byCode.id;
  return raw;
}

function submissionFingerprint(sub){
  return [
    String(sub.problemId||''),
    String(sub.verdict||''),
    String(Number(sub.at||0)),
    String(sub.code||'').slice(0,80),
  ].join('|');
}

async function fetchRelationalSubmissionsForUser(username,localUserId){
  if(!SB||STORAGE_MODE!=='supabase'||!username)return [];
  try{
    const uid=await getRelationalUserId(username);
    if(!uid)return [];
    const {data,error}=await SB
      .from('submissions')
      .select('id,problem_id,contest_id,submitted_code,verdict,runtime_ms,tests_passed,total_tests,score,submitted_at,judged_at')
      .eq('user_id',uid)
      .order('submitted_at',{ascending:false});
    if(error||!Array.isArray(data))return [];
    return data.map(row=>({
      id:`db-sub-${row.id}`,
      userId:localUserId||`db-${uid}`,
      problemId:mapRelationalProblemIdToLocal(row.problem_id),
      contestId:row.contest_id==null?null:String(row.contest_id),
      code:row.submitted_code||'',
      verdict:mapRelationalVerdictToLocal(row.verdict),
      timeTaken:Math.max(0,Number(row.runtime_ms||0))/1000,
      at:new Date(row.submitted_at||row.judged_at||Date.now()).getTime(),
      tcPassed:Number(row.tests_passed||0),
      tcTotal:Number(row.total_tests||0),
      publicPassed:Number(row.tests_passed||0),
      publicTotal:Number(row.total_tests||0),
      dbScore:Number(row.score||0),
      isSubmitted:true,
      submittedVia:'submit-button',
    }));
  }catch(err){
    console.warn('Relational submissions fetch exception:',err?.message||err);
    return [];
  }
}

async function hydrateSubmissionsFromRelational(user){
  if(!user?.username||!user?.userId)return;
  const remote=normalizeSubmissionList(await fetchRelationalSubmissionsForUser(user.username,user.userId)).filter(isCountableSubmission);
  if(!remote.length){
    recomputeCurrentUserStatsFromSubmissions();
    return;
  }

  const existing=normalizeSubmissionList(S.submissions);
  const existingIds=new Set(existing.map(s=>String(s.id||'')));
  const existingPrints=new Set(existing.map(submissionFingerprint));
  const toAdd=remote.filter(s=>!existingIds.has(String(s.id||''))&&!existingPrints.has(submissionFingerprint(s)));
  if(!toAdd.length){
    recomputeCurrentUserStatsFromSubmissions();
    return;
  }

  const merged=[...existing,...toAdd].sort((a,b)=>Number(b.at||0)-Number(a.at||0));
  S.submissions=merged;
  LS.set(`subs:${user.userId}`,merged);
  recomputeCurrentUserStatsFromSubmissions();
  rerenderCurrentViewPreserveState();
}

function serializeProblemTestCases(testCases){
  return (testCases||[]).map(tc=>{
    const {validate,...rest}=tc;
    return rest;
  });
}

function parseRelationalJson(value){
  if(value==null)return null;
  if(typeof value==='string'){
    const t=value.trim();
    if(!t)return null;
    try{return JSON.parse(t);}catch{return null;}
  }
  return value;
}

function normalizeSampleOutput(sampleOutput,solution){
  const parsed=parseRelationalJson(sampleOutput);
  if(parsed&&Array.isArray(parsed.columns)){
    const cols=parsed.columns.map(c=>String(c));
    const rows=Array.isArray(parsed.rows)?parsed.rows.map(r=>{
      if(Array.isArray(r))return r;
      if(r&&typeof r==='object')return cols.map(c=>r[c]??r[String(c).toLowerCase()]??null);
      return [];
    }):[];
    return {columns:cols,rows};
  }
  const ref=(solution&&typeof runSQL==='function')?runSQL(solution,DB):null;
  if(ref&&!ref.error&&Array.isArray(ref.columns)&&Array.isArray(ref.rows)){
    return {
      columns:[...ref.columns],
      rows:ref.rows.slice(0,Math.min(5,ref.rows.length)).map(row=>row.map(cell=>cell==null?'NULL':String(cell))),
    };
  }
  return null;
}

function normalizeSchemaHint(schemaHint){
  const parsed=parseRelationalJson(schemaHint);
  if(parsed&&parsed.table)return parsed;
  return null;
}

function hydrateProblemFromRelationalRow(row){
  const solution=row.solution||'SELECT 1';
  const parsedCases=parseRelationalJson(row.test_cases);
  const rawCases=Array.isArray(parsedCases)?parsedCases:[];
  const testCases=rawCases.map((tc,idx)=>({
    id:tc.id||`${row.id}-tc-${idx+1}`,
    name:tc.name||`Test ${idx+1}`,
    desc:tc.desc||'',
    hint:tc.hint||'',
    hidden:tc.hidden===true,
    validate:buildValidator(tc,{solution,description:row.description||''}),
  }));

  return {
    id:row.id,
    code:row.code||String(row.id||'').toUpperCase(),
    title:row.title||'Untitled Problem',
    difficulty:row.difficulty||'Easy',
    points:Number(row.points||100),
    timeLimit:null,
    category:row.category||'General',
    tags:Array.isArray(row.tags)?row.tags:[],
    description:row.description||'',
    solution,
    sampleOutput:normalizeSampleOutput(row.sample_output,solution),
    schemaHint:normalizeSchemaHint(row.schema_hint),
    testCases,
    dailyDate:row.daily_date||null,
  };
}

async function loadProblemsFromRelational(){
  if(!SB||STORAGE_MODE!=='supabase'){
    return Promise.resolve({success:false,problems:null,reason:'Supabase not configured'});
  }
  try{
    const {data,error}=await SB
      .from('problems')
      .select('*')
      .eq('is_active',true)
      .order('created_at',{ascending:true});
    if(error){
      console.warn('Supabase problems load failed:',error.message||error);
      return {success:false,problems:null,error:error.message||error};
    }
    const problems=(data||[]).map(hydrateProblemFromRelationalRow);
    return {success:true,problems,count:problems.length};
  }catch(err){
    console.warn('Supabase problems load exception:',err?.message||err);
    return {success:false,problems:null,error:err?.message||err};
  }
}

async function syncProblemToRelational(problem){
  if(!SB||STORAGE_MODE!=='supabase'||!problem?.id){
    return Promise.resolve({success:false,reason:'Supabase not available or problem data incomplete'});
  }
  try{
    const payload={
      id:problem.id,
      code:problem.code||String(problem.id).toUpperCase(),
      title:problem.title||'Untitled Problem',
      difficulty:problem.difficulty||'Easy',
      points:Number(problem.points||100),
      time_limit:null,
      category:problem.category||'General',
      tags:Array.isArray(problem.tags)?problem.tags:[],
      description:problem.description||'',
      solution:problem.solution||'SELECT 1',
      sample_output:parseRelationalJson(problem.sampleOutput)||problem.sampleOutput||null,
      schema_hint:parseRelationalJson(problem.schemaHint)||problem.schemaHint||null,
      test_cases:serializeProblemTestCases(problem.testCases),
      daily_date:problem.dailyDate||null,
      is_active:true,
      created_by:S.user?.username||'system',
      updated_at:new Date().toISOString(),
    };
    const {error}=await SB.from('problems').upsert(payload,{onConflict:'id'});
    if(error){
      console.warn('Supabase problem sync failed:',error.message||error);
      return {success:false,error:error.message||error};
    }
    return {success:true,problemId:problem.id};
  }catch(err){
    console.warn('Supabase problem sync exception:',err?.message||err);
    return {success:false,error:err?.message||err};
  }
}

async function deactivateProblemInRelational(problemId){
  if(!SB||STORAGE_MODE!=='supabase'||!problemId){
    return Promise.resolve({success:false,reason:'Supabase not available or problem ID missing'});
  }
  try{
    const {error}=await SB
      .from('problems')
      .update({is_active:false,updated_at:new Date().toISOString()})
      .eq('id',problemId);
    if(error){
      console.warn('Supabase problem deactivate failed:',error.message||error);
      return {success:false,error:error.message||error};
    }
    return {success:true,problemId};
  }catch(err){
    console.warn('Supabase problem deactivate exception:',err?.message||err);
    return {success:false,error:err?.message||err};
  }
}

async function seedProblemsToRelational(problems){
  if(!SB||STORAGE_MODE!=='supabase'||!Array.isArray(problems)||!problems.length)return;
  for(const p of problems){
    await syncProblemToRelational(p);
  }
}

function serializeContestForRelational(contest){
  return {
    id:String(contest.id),
    title:contest.title||'Untitled Contest',
    description:contest.description||'',
    type:contest.type||'official',
    status:contest.status||'upcoming',
    start_time:new Date(Number(contest.startTime||Date.now())).toISOString(),
    end_time:new Date(Number(contest.endTime||Date.now())).toISOString(),
    duration_minutes:Number(contest.duration||120),
    problem_ids:Array.isArray(contest.problemIds)?contest.problemIds:[],
    is_public:contest.isPublic!==false,
    max_participants:Number(contest.maxParticipants||500),
    announcement:contest.announcement||'',
    created_by:String(contest.createdBy||S.user?.username||S.user?.userId||'system'),
    invitees:Array.isArray(contest.invitees)?contest.invitees:[],
    participants:Array.isArray(contest.participants)?contest.participants:[],
    password:contest.password||'',
    updated_at:new Date().toISOString(),
  };
}

function hydrateContestFromRelationalRow(row){
  const startTs=row.start_time?new Date(row.start_time).getTime():Date.now();
  const endTs=row.end_time?new Date(row.end_time).getTime():(startTs+Number(row.duration_minutes||120)*60000);
  return {
    id:String(row.id),
    title:row.title||'Untitled Contest',
    description:row.description||'',
    type:row.type||'official',
    status:row.status||'upcoming',
    startTime:startTs,
    endTime:endTs,
    duration:Number(row.duration_minutes||120),
    problemIds:Array.isArray(row.problem_ids)?row.problem_ids:[],
    isPublic:row.is_public!==false,
    maxParticipants:Number(row.max_participants||500),
    announcement:row.announcement||'',
    createdBy:row.created_by||'system',
    invitees:Array.isArray(row.invitees)?row.invitees:[],
    participants:Array.isArray(row.participants)?row.participants:[],
    password:row.password||'',
  };
}

async function loadContestsFromRelational(){
  if(!SB||STORAGE_MODE!=='supabase'){
    return Promise.resolve({success:false,contests:null,reason:'Supabase not configured'});
  }
  try{
    const {data,error}=await SB.from('contests').select('*').order('start_time',{ascending:false});
    if(error){
      console.warn('Supabase contests load failed:',error.message||error);
      return {success:false,contests:null,error:error.message||error};
    }
    const contests=(data||[]).map(hydrateContestFromRelationalRow);
    return {success:true,contests,count:contests.length};
  }catch(err){
    console.warn('Supabase contests load exception:',err?.message||err);
    return {success:false,contests:null,error:err?.message||err};
  }
}

async function syncContestToRelational(contest){
  if(!SB||STORAGE_MODE!=='supabase'||!contest?.id){
    return Promise.resolve({success:false,reason:'Supabase not available or contest data incomplete'});
  }
  try{
    const payload=serializeContestForRelational(contest);
    const {error}=await SB.from('contests').upsert(payload,{onConflict:'id'});
    if(error){
      console.warn('Supabase contest sync failed:',error.message||error);
      return {success:false,error:error.message||error};
    }
    return {success:true,contestId:contest.id};
  }catch(err){
    console.warn('Supabase contest sync exception:',err?.message||err);
    return {success:false,error:err?.message||err};
  }
}

async function seedContestsToRelational(contests){
  if(!SB||STORAGE_MODE!=='supabase'||!Array.isArray(contests)||!contests.length)return;
  for(const c of contests){
    await syncContestToRelational(c);
  }
}

async function deleteContestFromRelational(contestId){
  if(!SB||STORAGE_MODE!=='supabase'||!contestId){
    return Promise.resolve({success:false,reason:'Supabase not available or contest ID missing'});
  }
  try{
    const {error}=await SB.from('contests').delete().eq('id',String(contestId));
    if(error){
      console.warn('Supabase contest delete failed:',error.message||error);
      return {success:false,error:error.message||error};
    }
    return {success:true,contestId};
  }catch(err){
    console.warn('Supabase contest delete exception:',err?.message||err);
    return {success:false,error:err?.message||err};
  }
}

function toast(msg,type='info'){
  const t=document.createElement('div');
  t.className=`toast t-${type==='success'?'ok':type==='error'?'err':type==='warn'?'warn':'inf'}`;
  t.innerHTML=`<span>${type==='success'?'✓':type==='error'?'✗':type==='warn'?'[!]':'ℹ'}</span><span>${esc(msg)}</span>`;
  el('toasts').appendChild(t);
  setTimeout(()=>t.remove(),4000);
}
function persistProblems(){LS.set('problems',S.problems.map(p=>{const{testCases,...r}=p;return{...r,testCases:testCases.map(tc=>{const{validate,...t}=tc;return t;})};}))}
function normalizeResultCell(v){
  if(v==null)return null;
  const n=Number(v);
  if(Number.isFinite(n)&&String(v).trim()!=='')return n;
  return String(v).trim().toLowerCase();
}
function normalizeResultColumns(cols){
  return (cols||[]).map(c=>String(c).trim().toLowerCase());
}
function normalizeResultRow(row){
  return (row||[]).map(normalizeResultCell);
}
function rowsMatch(actualRows,expectedRows,ignoreOrder=false){
  const a=(actualRows||[]);
  const b=(expectedRows||[]);
  if(a.length!==b.length)return false;
  if(!ignoreOrder){
    for(let i=0;i<b.length;i++){
      const ar=normalizeResultRow(a[i]);
      const br=normalizeResultRow(b[i]);
      if(ar.length!==br.length)return false;
      for(let j=0;j<br.length;j++)if(ar[j]!==br[j])return false;
    }
    return true;
  }
  const toKey=row=>JSON.stringify(normalizeResultRow(row));
  const ak=a.map(toKey).sort();
  const bk=b.map(toKey).sort();
  for(let i=0;i<bk.length;i++)if(ak[i]!==bk[i])return false;
  return true;
}
function resultsMatch(actual,expected,{requireColumnNames=true,ignoreRowOrder=false}={}){
  if(!actual||!expected)return false;
  const actualCols=normalizeResultColumns(actual.columns);
  const expectedCols=normalizeResultColumns(expected.columns);
  if(actualCols.length!==expectedCols.length)return false;
  if(requireColumnNames){
    for(let i=0;i<expectedCols.length;i++){
      if(actualCols[i]!==expectedCols[i])return false;
    }
  }
  return rowsMatch(actual.rows||[],expected.rows||[],ignoreRowOrder);
}
function resultsExactlyMatch(actual,expected){
  return resultsMatch(actual,expected,{requireColumnNames:true,ignoreRowOrder:false});
}
function matchesSampleOutput(result,sample){
  if(!sample||!Array.isArray(sample.columns)||!Array.isArray(sample.rows))return true;
  return resultsMatch(result,sample,{requireColumnNames:false,ignoreRowOrder:true});
}
function buildValidator(tc,prob){
  const meta=`${tc?.name||''} ${tc?.desc||''} ${tc?.hint||''} ${prob?.description||''}`.toLowerCase();
  const expectedRowsMatch=meta.match(/(?:exactly|must return|return)\s+(\d+)\s+rows?/i);
  const expectedRows=expectedRowsMatch?Number(expectedRowsMatch[1]):null;

  const requiredCols=[];
  const returnColsMatch=meta.match(/return(?: the columns?)?\s*:?\s*([a-z0-9_,\s]+)/i);
  if(returnColsMatch){
    returnColsMatch[1].split(',').map(s=>s.trim()).filter(Boolean).forEach(c=>requiredCols.push(c));
  }
  const mustReturnTwo=meta.match(/must return\s+([a-z_][a-z0-9_]*)\s+(?:and|&)\s+([a-z_][a-z0-9_]*)/i);
  if(mustReturnTwo){
    requiredCols.push(mustReturnTwo[1],mustReturnTwo[2]);
  }

  const orderDir=/\b(desc|descending|highest\s+first)\b/i.test(meta)
    ?'desc'
    :/\b(asc|ascending|lowest\s+first)\b/i.test(meta)
      ?'asc'
      :null;

  const thresholdMatch=meta.match(/(>=|<=|>|<)\s*\$?\s*(\d+(?:\.\d+)?)/);
  const threshold=thresholdMatch?{op:thresholdMatch[1],value:Number(thresholdMatch[2])}:null;

  const valueColHint=/\bavg\b/i.test(meta)
    ?'avg'
    :/\bsalary\b/i.test(meta)
      ?'salary'
      :/\b(total|count|credits|score|revenue)\b/i.test(meta)
        ?'total'
        :null;

  const opPass=(v,op,t)=>{
    if(!Number.isFinite(v)||!Number.isFinite(t))return false;
    if(op==='>')return v>t;
    if(op==='<')return v<t;
    if(op==='>=')return v>=t;
    if(op==='<=')return v<=t;
    return false;
  };

  const expectedFromSolution=(prob?.solution&&typeof runSQL==='function')
    ? runSQL(prob.solution,DB)
    : null;
  const hasReferenceResult=Boolean(expectedFromSolution&&!expectedFromSolution.error&&Array.isArray(expectedFromSolution.rows));

  return (r)=>{
    if(r.error||!r.rows)return false;

    let checks=0;
    const cols=(r.columns||[]).map(c=>String(c).toLowerCase());

    // Canonical check: user output must match official solution output.
    if(hasReferenceResult){
      checks++;
      if(!resultsMatch(r,expectedFromSolution,{requireColumnNames:false,ignoreRowOrder:true}))return false;
    }

    if(prob?.sampleOutput){
      checks++;
      if(!matchesSampleOutput(r,prob.sampleOutput))return false;
    }

    if(requiredCols.length){
      checks++;
      const ok=requiredCols.every(req=>cols.some(c=>c===req||c.includes(req)));
      if(!ok)return false;
    }

    if(expectedRows!=null&&Number.isFinite(expectedRows)){
      checks++;
      if(r.rowCount!==expectedRows)return false;
    }

    if(orderDir&&r.rowCount>1){
      const idx=valueColHint
        ? cols.findIndex(c=>c.includes(valueColHint))
        : 0;
      if(idx>=0){
        checks++;
        for(let i=1;i<r.rows.length;i++){
          const a=Number(r.rows[i-1][idx]);
          const b=Number(r.rows[i][idx]);
          if(Number.isFinite(a)&&Number.isFinite(b)){
            if(orderDir==='desc'&&b>a)return false;
            if(orderDir==='asc'&&b<a)return false;
          }else{
            const cmp=String(r.rows[i-1][idx]??'').localeCompare(String(r.rows[i][idx]??''));
            if(orderDir==='desc'&&cmp<0)return false;
            if(orderDir==='asc'&&cmp>0)return false;
          }
        }
      }
    }

    if(threshold){
      const idx=valueColHint
        ? cols.findIndex(c=>c.includes(valueColHint))
        : -1;
      if(idx>=0){
        checks++;
        if(!r.rows.every(row=>opPass(Number(row[idx]),threshold.op,threshold.value)))return false;
      }
    }

    if(checks===0)return false;
    return true;
  };
}

function inferSqlType(value){
  if(value==null)return 'VARCHAR';
  if(typeof value==='number')return Number.isInteger(value)?'INT':'FLOAT';
  if(typeof value==='boolean')return 'BOOLEAN';
  const s=String(value);
  if(/^\d{4}-\d{2}-\d{2}$/.test(s))return 'DATE';
  if(/^\d+$/.test(s))return 'INT';
  if(/^\d+\.\d+$/.test(s))return 'FLOAT';
  return 'VARCHAR';
}

function inferTablesFromProblem(problem){
  const sql=String(problem?.solution||'');
  const found=[];
  const re=/\b(?:from|join)\s+"?([a-z_][a-z0-9_]*)"?/ig;
  let m;
  while((m=re.exec(sql))){
    const t=String(m[1]||'').trim().toLowerCase();
    if(t&&!found.includes(t))found.push(t);
  }
  if(found.length)return found;
  if(problem?.schemaHint?.table){
    return String(problem.schemaHint.table).split('·').map(t=>String(t).trim().toLowerCase()).filter(Boolean);
  }
  return [];
}

function getDefaultProblemSeed(problem){
  if(!problem)return null;
  const byId=DEFAULT_PROBLEM_BY_ID[String(problem.id||'')];
  if(byId)return byId;
  const code=String(problem.code||'').toUpperCase();
  if(code&&DEFAULT_PROBLEM_BY_CODE[code])return DEFAULT_PROBLEM_BY_CODE[code];
  return null;
}

function applyDefaultProblemFallback(problem){
  const seed=getDefaultProblemSeed(problem);
  if(!seed)return problem;
  return {
    ...problem,
    sampleOutput:problem.sampleOutput||seed.sampleOutput||null,
    schemaHint:problem.schemaHint||seed.schemaHint||null,
    description:String(problem.description||'').trim()||String(seed.description||'').trim(),
  };
}

function hasStoryDescription(desc){
  const d=String(desc||'').toLowerCase();
  return d.includes('mission brief')&&d.includes('your task');
}

function makeStoryDescription(problem){
  const existing=String(problem?.description||'').trim();
  if(existing)return existing;
  return 'Write a single SELECT query that satisfies the stated requirements.';
}

function ensureProblemDescription(problem){
  const base=makeStoryDescription(problem);
  const sql=String(problem?.solution||'');
  const textScope=`${String(problem?.title||'')} ${base}`.toLowerCase();
  const baseLower=base.toLowerCase();
  const needsReturn=!/\breturn\b|\bcolumns?\b/i.test(base);
  const needsOrder=/\bORDER\s+BY\b/i.test(sql)&&!/\border\b/i.test(base);
  const needsTable=Boolean(problem?.schemaHint?.table)&&!/(\btable\b|\btables\b|\bfrom\b|\bdataset\b|\bjoin\b)/i.test(base);
  const needsTaskLine=!/(\bwrite\b.*\bselect\b|\byour task\b|\bgoal\b)/i.test(base);
  const isGapOrSimilarityPrompt=/(skill\s*gap|gap\s*detection|similar\s*question|similarity|matching|mismatch)/i.test(textScope);

  if(!base)return base;
  if(!needsReturn&&!needsOrder&&!needsTable&&!needsTaskLine&&!isGapOrSimilarityPrompt)return base;

  const extra=[];
  const cols=Array.isArray(problem?.sampleOutput?.columns)?problem.sampleOutput.columns:[];
  const hasLine=(text)=>baseLower.includes(String(text).toLowerCase());
  if(needsTaskLine){
    const line='Requirement: write one SELECT query for this task.';
    if(!hasLine(line))extra.push(line);
  }
  if(needsReturn&&cols.length){
    const line=`Return columns: ${cols.join(', ')}.`;
    if(!hasLine(line))extra.push(line);
  }
  if(needsOrder){
    const orderClause=sql.match(/\bORDER\s+BY\s+(.+?)(?:\s+LIMIT|$)/i)?.[1]?.trim();
    if(orderClause){
      const line=`Order by: ${orderClause}.`;
      if(!hasLine(line))extra.push(line);
    }
    else {
      const line='Apply the required ordering in the final output.';
      if(!hasLine(line))extra.push(line);
    }
  }
  if(needsTable&&problem.schemaHint?.table){
    const line=`Use table(s): ${String(problem.schemaHint.table).replace(/\s*·\s*/g,', ')}.`;
    if(!hasLine(line))extra.push(line);
  }
  if(isGapOrSimilarityPrompt){
    const clarification='Clarification: apply the exact matching/threshold rules in the prompt and return only qualifying records.';
    if(!hasLine(clarification))extra.push(clarification);
    if(cols.length){
      const line=`Output schema: ${cols.join(', ')}.`;
      if(!hasLine(line))extra.push(line);
    }
  }

  if(!extra.length)return base;
  const compactBase=base.replace(/\n{3,}/g,'\n\n').trim();
  return `${compactBase}\n\n${extra.join('\n')}`;
}

function ensureProblemCompleteness(problem){
  if(!problem)return problem;
  const out=applyDefaultProblemFallback({...problem});
  const ref=(out.solution&&typeof runSQL==='function')?runSQL(out.solution,DB):null;
  const refOk=Boolean(ref&&!ref.error&&Array.isArray(ref.columns)&&Array.isArray(ref.rows));

  if(refOk&&(!out.sampleOutput||!Array.isArray(out.sampleOutput.columns)||!out.sampleOutput.columns.length)){
    out.sampleOutput={
      columns:[...ref.columns],
      rows:ref.rows.slice(0,Math.min(5,ref.rows.length)).map(row=>row.map(cell=>cell==null?'NULL':String(cell))),
    };
  }

  if(!out.schemaHint||!out.schemaHint.table){
    const tables=inferTablesFromProblem(out);
    if(tables.length){
      const schemaCols=[];
      tables.forEach(t=>{
        const rows=DB[t];
        if(!Array.isArray(rows)||!rows.length)return;
        const sample=rows[0];
        Object.keys(sample).forEach(col=>schemaCols.push([tables.length>1?`${t}.${col}`:col,inferSqlType(sample[col])]));
      });
      out.schemaHint={
        table:tables.join('  ·  '),
        columns:schemaCols,
      };
    }
  }

  const baseCases=Array.isArray(out.testCases)?[...out.testCases]:[];
  const rowCount=refOk?ref.rows.length:0;
  const firstCols=out.sampleOutput?.columns?.slice(0,4)||[];
  const autoPool=[
    {
      id:'tc-auto-rows',
      name:'Row Count',
      desc:`Must return exactly ${rowCount} rows`,
      hint:'Match the reference solution row count',
    },
    {
      id:'tc-auto-cols',
      name:'Required Columns',
      desc:firstCols.length?`Return: ${firstCols.join(', ')}`:'Return required columns',
      hint:'Match the expected selected columns',
    },
    {
      id:'tc-auto-ref',
      name:'Reference Match',
      desc:'Output must match reference solution semantics',
      hint:'Use the exact logic described in the statement',
    },
  ];

  if(baseCases.length<3){
    autoPool.forEach(tc=>{
      if(baseCases.length>=3)return;
      const exists=baseCases.some(x=>String(x?.name||'').toLowerCase()===String(tc.name).toLowerCase());
      if(!exists)baseCases.push({...tc});
    });
  }

  out.testCases=baseCases.map((tc,idx)=>({
    ...tc,
    id:tc.id||`${out.id}-tc-${idx+1}`,
    name:tc.name||`Test ${idx+1}`,
    desc:tc.desc||'',
    hint:tc.hint||'',
    hidden:tc.hidden===true,
    validate:tc.validate||buildValidator(tc,out),
  }));

  out.description=ensureProblemDescription(out);

  return out;
}

function hasValidSampleOutput(problem){
  return Boolean(
    problem
    && problem.sampleOutput
    && Array.isArray(problem.sampleOutput.columns)
    && Array.isArray(problem.sampleOutput.rows)
  );
}

function repairProblemBank(problems){
  const input=Array.isArray(problems)?problems:[];
  const repaired=[];
  const normalized=input.map(p=>{
    const beforeValid=hasValidSampleOutput(p);
    const beforeStory=hasStoryDescription(p?.description||'');
    const next=ensureProblemCompleteness(p);
    const afterValid=hasValidSampleOutput(next);
    const afterStory=hasStoryDescription(next?.description||'');
    if((!beforeValid&&afterValid)||(!beforeStory&&afterStory))repaired.push(next);
    return next;
  });
  return {problems:normalized,repaired};
}

function injectHiddenStrongTestCases(problems){
  return problems.map(p=>{
    const testCases=(p.testCases||[]).map(tc=>({
      ...tc,
      hidden:tc.hidden===true,
      validate:tc.validate||buildValidator(tc,p),
    }));

    const guardId=`${p.id}__hidden_wa_guard`;
    const hasGuard=testCases.some(tc=>tc&&tc.id===guardId);
    if(!hasGuard){
      testCases.push({
        id:guardId,
        name:'Hidden WA Guard',
        desc:'System check: output must exactly match expected result',
        hint:'',
        hidden:true,
        system:true,
        validate:(r)=>{
          if(r.error||!Array.isArray(r.rows))return false;
          const ref=runSQL(p.solution||'SELECT 1',DB);
          if(ref.error||!Array.isArray(ref.rows))return false;
          return resultsMatch(r,ref,{requireColumnNames:false,ignoreRowOrder:true});
        },
      });
    }

    return {...p,testCases};
  });
}

function normalizeKnownSampleOutputs(problems){
  if(!Array.isArray(problems))return [];
  return problems.map(p=>{
    if(!p)return p;
    const code=String(p.code||'').toUpperCase();
    if(code!=='BSQ-002'&&p.id!=='p2')return p;
    return {
      ...p,
      solution:'SELECT dept_id, COUNT(*) AS total_employees FROM employees GROUP BY dept_id ORDER BY total_employees DESC, dept_id ASC',
      sampleOutput:{
        columns:['dept_id','total_employees'],
        rows:[['1','3'],['2','3'],['3','2'],['4','2']],
      },
      testCases:[
        {
          id:'tc1',
          name:'Four departments',
          desc:'Must return 4 rows (one per dept)',
          hint:'GROUP BY dept_id',
          hidden:true,
        },
        {
          id:'tc2',
          name:'Count column exists',
          desc:'Must have a column for the count',
          hint:'Use COUNT(*) AS total_employees',
          hidden:true,
        },
        {
          id:'tc3',
          name:'Descending order',
          desc:'Highest count first',
          hint:'ORDER BY total_employees DESC, dept_id ASC',
          hidden:true,
        },
      ],
    };
  });
}

const PRACTICE_LAB_TASKS = [
  {
    id:'ddl-1',
    title:'Create a table',
    question:'Create a table named classes with columns: id INT, title TEXT, seats INT.',
    hint:'Use CREATE TABLE classes (...).',
    answer:'CREATE TABLE classes (id INT, title TEXT, seats INT);',
  },
  {
    id:'dml-1',
    title:'Insert rows',
    question:'Insert 2 rows into learners table with your own names and marks.',
    hint:'Use INSERT INTO learners (id, name, marks) VALUES (...).',
    answer:"INSERT INTO learners (id, name, marks) VALUES (10, 'Mina', 84);\nINSERT INTO learners (id, name, marks) VALUES (11, 'Rafi', 90);",
  },
  {
    id:'dml-2',
    title:'Update with WHERE',
    question:'Increase marks by setting a learner\'s marks to 95 for id = 2.',
    hint:'Use UPDATE learners SET marks = 95 WHERE id = 2.',
    answer:'UPDATE learners SET marks = 95 WHERE id = 2;',
  },
  {
    id:'dml-3',
    title:'Delete data',
    question:'Delete absent learners from attendance table.',
    hint:"Use DELETE FROM attendance WHERE status = 'absent'.",
    answer:"DELETE FROM attendance WHERE status = 'absent';",
  },
  {
    id:'mixed-1',
    title:'Verify using SELECT',
    question:'Show learners ordered by marks descending.',
    hint:'Use SELECT * FROM learners ORDER BY marks DESC.',
    answer:'SELECT * FROM learners ORDER BY marks DESC;',
  },
];

function createDefaultPracticeLab(){
  return {
    tables:{
      learners:{
        columns:[{name:'id',type:'INT'},{name:'name',type:'TEXT'},{name:'marks',type:'INT'}],
        rows:[{id:1,name:'Aisha',marks:89},{id:2,name:'Bilal',marks:76},{id:3,name:'Chris',marks:91}],
      },
      attendance:{
        columns:[{name:'id',type:'INT'},{name:'learner_id',type:'INT'},{name:'status',type:'TEXT'}],
        rows:[{id:1,learner_id:1,status:'present'},{id:2,learner_id:2,status:'absent'},{id:3,learner_id:3,status:'present'}],
      }
    }
  };
}

function persistPracticeLab(){
  LS.set('practiceLab',S.practiceLab);
}

function stripSqlLineComments(sql){
  const src=String(sql||'');
  let out='';
  let i=0;
  let quote='';
  while(i<src.length){
    const ch=src[i];
    if((ch==='\''||ch==='"')&&(!quote||quote===ch)){
      quote=quote?'':ch;
      out+=ch;
      i++;
      continue;
    }
    if(!quote&&ch==='-'&&src[i+1]==='-'){
      while(i<src.length&&src[i]!=='\n')i++;
      if(i<src.length&&src[i]==='\n'){
        out+='\n';
        i++;
      }
      continue;
    }
    out+=ch;
    i++;
  }
  return out;
}

function splitSQLStatements(sql){
  const source=stripSqlLineComments(sql);
  const out=[];
  let cur='';
  let quote='';
  for(const ch of source){
    if((ch==='\''||ch==='"')&&(!quote||quote===ch))quote=quote?'' : ch;
    if(ch===';'&&!quote){if(cur.trim())out.push(cur.trim());cur='';continue;}
    cur+=ch;
  }
  if(cur.trim())out.push(cur.trim());
  return out;
}

function splitCsvSafe(raw){
  const out=[];
  let cur='';
  let quote='';
  for(const ch of raw){
    if((ch==='\''||ch==='"')&&(!quote||quote===ch))quote=quote?'' : ch;
    if(ch===','&&!quote){out.push(cur.trim());cur='';continue;}
    cur+=ch;
  }
  if(cur.trim())out.push(cur.trim());
  return out;
}

function parseSQLLiteral(v){
  const x=v.trim();
  if(/^null$/i.test(x))return null;
  if((x.startsWith('\'')&&x.endsWith('\''))||(x.startsWith('"')&&x.endsWith('"')))return x.slice(1,-1);
  const n=Number(x);
  return Number.isNaN(n)?x:n;
}

function castByType(value,type){
  if(value==null)return null;
  const t=String(type||'TEXT').toUpperCase();
  if(t.includes('INT')||t.includes('NUM')||t.includes('DEC')||t.includes('FLOAT')){
    const n=Number(value);
    return Number.isNaN(n)?value:n;
  }
  return String(value);
}

function labSchemaToData(){
  const out={};
  Object.entries(S.practiceLab.tables).forEach(([name,t])=>{out[name]=t.rows.map(r=>({...r}));});
  return out;
}

function runPracticeLab(){
  const sql=window.practiceLabEditor?window.practiceLabEditor.getValue():''.trim();
  if(!sql.trim()){toast('Write some DDL/DML first','warn');return;}
  sql=sql.trim();
  if(!sql){toast('Write some DDL/DML first','warn');return;}

  const statements=splitSQLStatements(sql);
  const outputs=[];

  try{
    for(const stmtRaw of statements){
      const stmt=stmtRaw.replace(/;$/,'').trim();

      const createM=stmt.match(/^CREATE\s+TABLE\s+(\w+)\s*\((.+)\)$/i);
      if(createM){
        const tname=createM[1].toLowerCase();
        if(S.practiceLab.tables[tname])throw new Error(`Table '${tname}' already exists.`);
        const cols=splitCsvSafe(createM[2]).map(c=>{
          const [name,type='TEXT']=c.trim().split(/\s+/);
          if(!name)throw new Error('Invalid column definition in CREATE TABLE.');
          return {name:name.toLowerCase(),type:type.toUpperCase()};
        });
        S.practiceLab.tables[tname]={columns:cols,rows:[]};
        outputs.push({type:'msg',text:`Created table '${tname}'.`});
        continue;
      }

      const dropM=stmt.match(/^DROP\s+TABLE\s+(\w+)$/i);
      if(dropM){
        const tname=dropM[1].toLowerCase();
        if(!S.practiceLab.tables[tname])throw new Error(`Table '${tname}' does not exist.`);
        delete S.practiceLab.tables[tname];
        outputs.push({type:'msg',text:`Dropped table '${tname}'.`});
        continue;
      }

      const insertM=stmt.match(/^INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)$/i);
      if(insertM){
        const tname=insertM[1].toLowerCase();
        const t=S.practiceLab.tables[tname];
        if(!t)throw new Error(`Table '${tname}' does not exist.`);
        const cols=splitCsvSafe(insertM[2]).map(c=>c.toLowerCase());
        const vals=splitCsvSafe(insertM[3]).map(parseSQLLiteral);
        if(cols.length!==vals.length)throw new Error('INSERT columns and values count do not match.');
        const row={};
        t.columns.forEach(c=>{row[c.name]=null;});
        cols.forEach((c,i)=>{
          const def=t.columns.find(x=>x.name===c);
          if(!def)throw new Error(`Unknown column '${c}' in table '${tname}'.`);
          row[c]=castByType(vals[i],def.type);
        });
        t.rows.push(row);
        outputs.push({type:'msg',text:`Inserted 1 row into '${tname}'.`});
        continue;
      }

      const updateM=stmt.match(/^UPDATE\s+(\w+)\s+SET\s+(.+?)(?:\s+WHERE\s+(.+))?$/i);
      if(updateM){
        const tname=updateM[1].toLowerCase();
        const t=S.practiceLab.tables[tname];
        if(!t)throw new Error(`Table '${tname}' does not exist.`);
        const setParts=splitCsvSafe(updateM[2]);
        const assigns=setParts.map(p=>{
          const m=p.match(/^(\w+)\s*=\s*(.+)$/);
          if(!m)throw new Error('Invalid SET clause in UPDATE.');
          return {col:m[1].toLowerCase(),val:parseSQLLiteral(m[2])};
        });
        let count=0;
        t.rows.forEach(r=>{
          const ok=updateM[3]?ew(updateM[3],r):true;
          if(ok){
            assigns.forEach(a=>{
              const def=t.columns.find(x=>x.name===a.col);
              if(!def)throw new Error(`Unknown column '${a.col}' in table '${tname}'.`);
              r[a.col]=castByType(a.val,def.type);
            });
            count++;
          }
        });
        outputs.push({type:'msg',text:`Updated ${count} row(s) in '${tname}'.`});
        continue;
      }

      const deleteM=stmt.match(/^DELETE\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+))?$/i);
      if(deleteM){
        const tname=deleteM[1].toLowerCase();
        const t=S.practiceLab.tables[tname];
        if(!t)throw new Error(`Table '${tname}' does not exist.`);
        const before=t.rows.length;
        t.rows=t.rows.filter(r=>deleteM[2]?!ew(deleteM[2],r):false);
        const removed=before-t.rows.length;
        outputs.push({type:'msg',text:`Deleted ${removed} row(s) from '${tname}'.`});
        continue;
      }

      if(/^SELECT\b/i.test(stmt)){
        const res=runSQL(stmt,labSchemaToData());
        if(res.error)throw new Error(res.error);
        outputs.push({type:'table',result:res});
        continue;
      }

      throw new Error(`Unsupported statement: ${stmt.split(/\s+/)[0]}`);
    }

    persistPracticeLab();
    renderPracticeLabOutput(outputs);
    renderPracticeLabTables();
    toast('Practice SQL executed','success');
  }catch(err){
    renderPracticeLabOutput([{type:'err',text:err.message||String(err)}]);
    toast('Practice SQL failed','error');
  }
}

function renderPracticeLabOutput(outputs){
  const wrap=el('practice-lab-output');
  if(!wrap)return;
  wrap.innerHTML=outputs.map(o=>{
    if(o.type==='err')return `<div class="res-panel"><div class="res-hdr"><span style="color:var(--rose);font-weight:700">LAB ERROR</span></div><div style="padding:10px 12px;color:var(--rose);font-family:var(--mono);font-size:12px">${esc(o.text)}</div></div>`;
    if(o.type==='msg')return `<div class="res-panel" style="margin-bottom:8px"><div class="res-hdr"><span style="color:var(--grn);font-weight:700">OK</span></div><div style="padding:8px 12px;color:var(--t1);font-size:12px">${esc(o.text)}</div></div>`;
    const r=o.result;
    return `<div class="res-panel" style="margin-bottom:8px"><div class="res-hdr"><span style="color:var(--ind);font-weight:700">SELECT RESULT</span><span style="color:var(--t2)">${r.rowCount} rows</span></div><div class="res-body"><div class="tw"><table class="tbl"><thead><tr>${r.columns.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${r.rows.map(row=>`<tr>${row.map(v=>`<td>${v==null?'<span class="tbl-null">NULL</span>':esc(String(v))}</td>`).join('')}</tr>`).join('')||'<tr><td style="color:var(--t3)">No rows</td></tr>'}</tbody></table></div></div></div>`;
  }).join('');
}

function renderPracticeLabTables(){
  const wrap=el('practice-lab-tables');
  if(!wrap)return;
  const tables=Object.entries(S.practiceLab.tables);
  if(!tables.length){wrap.innerHTML='<div class="empty" style="padding:18px"><div class="empty-lbl">No tables in sandbox</div></div>';return;}
  wrap.innerHTML=tables.map(([name,t])=>`
    <div class="card" style="margin-bottom:8px">
      <div class="card-hdr"><div class="card-title" style="color:var(--grn)">${name}</div><span style="font-size:11px;color:var(--t3)">${t.rows.length} rows</span></div>
      <div class="card-body" style="padding:8px 10px">
        <div class="tw"><table class="tbl"><thead><tr>${t.columns.map(c=>`<th>${esc(c.name)}</th>`).join('')}</tr></thead><tbody>${t.rows.slice(0,6).map(r=>`<tr>${t.columns.map(c=>`<td>${r[c.name]==null?'<span class="tbl-null">NULL</span>':esc(String(r[c.name]))}</td>`).join('')}</tr>`).join('')||'<tr><td style="color:var(--t3)">No rows</td></tr>'}</tbody></table></div>
      </div>
    </div>`).join('');
}

function markPracticeTaskDone(taskId){
  S.practiceLabTaskDone=S.practiceLabTaskDone||{};
  S.practiceLabTaskDone[taskId]=!S.practiceLabTaskDone[taskId];
  LS.set('practiceLabTaskDone',S.practiceLabTaskDone);
  renderPracticeLabTasks();
}

function renderPracticeLabTasks(){
  const wrap=el('practice-lab-tasks');
  if(!wrap)return;
  if(!S.practiceLab||!S.practiceLab.tables){wrap.innerHTML='<div class="empty">Initializing...</div>';return;}
  const done=S.practiceLabTaskDone||{};
  
  // Display all current tables in sandbox on first task
  function getAllTablesHtml(){
    const tables=S.practiceLab.tables||{};
    const entries=Object.entries(tables);
    if(!entries.length)return '';
    return `<div style="margin-bottom:12px;padding:10px;background:var(--bg2);border:1px solid var(--line);border-radius:4px">
      <div style="font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;font-weight:700">Available Tables in Sandbox</div>
      ${entries.map(([name,t])=>`<div style="margin-bottom:8px;overflow-x:auto">
        <div style="font-size:10px;color:var(--t2);margin-bottom:4px;font-weight:600">${esc(name)}</div>
        <table class="tbl" style="font-size:11px"><thead><tr>${t.columns.map(c=>`<th>${esc(c.name)}</th>`).join('')}</tr></thead><tbody>${t.rows.slice(0,4).map(r=>`<tr>${t.columns.map(c=>`<td>${r[c.name]==null?'<span class="tbl-null">NULL</span>':esc(String(r[c.name]))}</td>`).join('')}</tr>`).join('')}</tbody></table>
      </div>`).join('')}
    </div>`;
  }
  
  wrap.innerHTML=PRACTICE_LAB_TASKS.map((t,i)=>{
    const tableHtml = i===0 ? getAllTablesHtml() : '';
    return `
    <div class="card" style="margin-bottom:8px">
      <div class="card-body" style="padding:10px 12px">
        <div class="fx ic sb mb2">
          <div style="font-size:12px;color:var(--t0);font-weight:700">Q${i+1}. ${esc(t.title)}</div>
          <label style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--t2);cursor:pointer"><input type="checkbox" ${done[t.id]?'checked':''} onchange="markPracticeTaskDone('${t.id}')">Done</label>
        </div>
        ${tableHtml}
        <div style="font-size:12px;color:var(--t1);line-height:1.6;margin-bottom:6px">${esc(t.question)}</div>
      </div>
    </div>`;
  }).join('');
}

function loadPracticeLabExample(){
  const code=`CREATE TABLE practice_orders (id INT, customer TEXT, amount INT);\nINSERT INTO practice_orders (id, customer, amount) VALUES (1, 'Nora', 1500);\nINSERT INTO practice_orders (id, customer, amount) VALUES (2, 'Omar', 2200);\nUPDATE practice_orders SET amount = 2400 WHERE id = 2;\nSELECT * FROM practice_orders ORDER BY amount DESC;`;
  if(window.practiceLabEditor)window.practiceLabEditor.setValue(code);
}

function resetPracticeLab(){
  S.practiceLab=createDefaultPracticeLab();
  persistPracticeLab();
  renderPracticeLabOutput([{type:'msg',text:'Sandbox reset to default tables.'}]);
  renderPracticeLabTables();
}

/* ══════════════════════════════════════════════════════════
   MOBILE SIDEBAR
══════════════════════════════════════════════════════════ */
function toggleSidebar(){
  const sb=el('sidebar'),bd=el('sb-backdrop'),hb=el('ham-btn');
  const open=sb.classList.toggle('open');
  bd.classList.toggle('show',open);
  hb.classList.toggle('open',open);
}

/* ══════════════════════════════════════════════════════════
   NAVIGATION
══════════════════════════════════════════════════════════ */
function nav(view, extra){
  if(S.currentView==='judge'&&view!=='judge'){
    saveJudgeSessionState(S.judgeContext);
  }
  if(view!=='contests')stopContestListCountdown();
  if(view!=='scoreboards'&&typeof stopScoreboardAutoRefresh==='function')stopScoreboardAutoRefresh();
  // Close mobile sidebar
  const _sb=el('sidebar'),_bd=el('sb-backdrop'),_hb=el('ham-btn');
  if(_sb)_sb.classList.remove('open');
  if(_bd)_bd.classList.remove('show');
  if(_hb)_hb.classList.remove('open');
  // Sync bottom nav
  document.querySelectorAll('#bottom-nav .bnav').forEach(b=>b.classList.toggle('on',b.dataset.bnav===view));
  document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'));
  document.querySelectorAll('.tnav,.slink').forEach(b=>{b.classList.remove('on');});
  const v=el(`view-${view}`);
  if(v)v.classList.remove('hidden');
  document.querySelectorAll(`[data-view="${view}"]`).forEach(b=>b.classList.add('on'));
  S.currentView=view;
  if(view==='home')renderHome();
  if(view==='contests')renderContests();
  if(view==='practice')renderPractice();
  if(view==='playground')renderPlayground();
  if(view==='submissions')renderSubmissions();
  if(view==='scoreboards')renderContestScoreboards(extra);
  if(view==='profile')renderProfile();
  if(view==='admin'){if(!isMaster()){nav('home');toast('Access denied','error');return;}renderAdmin();}
  if(view==='custom')renderCustom();
  if(view==='contest-detail'){
    const contestId=typeof extra==='string'?extra:extra?.contestId;
    const contest=getContestById(contestId);
    if(!contest){toast('Contest not found','error');return;}
    S.pendingContestAccess={contestId:contest.id,action:{type:'contest-detail',extra}};
    if(!ensureContestAccess(contest))return;
    S.pendingContestAccess=null;
    renderContestDetail(extra);
  }
  if(view==='judge'){
    if(S.currentView==='judge'&&S.judgeContext?.problemId){
      saveJudgeSessionState(S.judgeContext);
    }
    if(extra?.contestId){
      const contest=getContestById(extra.contestId);
      if(!contest){toast('Contest not found','error');return;}
      normalizeContestLifecycle(contest);
      if(contest.status==='ended'){
        const endedCtx={...extra,contestId:null,backView:'practice'};
        toast('Contest ended. This will be submitted as practice.','info');
        renderJudge(endedCtx);
        saveRouteState('judge',S.judgeContext);
        return;
      }
      S.pendingContestAccess={contestId:contest.id,action:{type:'judge',extra}};
      if(!ensureContestAccess(contest))return;
      S.pendingContestAccess=null;
      if(!canRevealContestProblems(contest)){
        toast(getContestProblemLockReason(contest)||'Problems are currently locked','warn');
        nav('contest-detail',contest.id);
        return;
      }
    }
    renderJudge(extra);
  }
  if(view==='contest-detail')saveRouteState('contest-detail',{contestId:S.currentContest});
  else if(view==='judge')saveRouteState('judge',S.judgeContext);
  else saveRouteState(view,extra);
}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>nav(b.dataset.view)));

/* ══════════════════════════════════════════════════════════
   RENDER TOPRIGHT
══════════════════════════════════════════════════════════ */
function renderTopRight(){
  const area=el('topright');
  if(S.user){
    area.innerHTML=`
      <div class="fx ic gap3">
        ${roleBadge(S.user.role)}
        <div style="display:flex;align-items:center;gap:7px">
          <div style="width:30px;height:30px;border-radius:6px;background:var(--bg3);border:1px solid var(--line2);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;color:var(--grn)">${esc(S.user.username[0].toUpperCase())}</div>
          <div>
            <div class="tr-username" style="font-size:12px;color:var(--t0)">${esc(S.user.username)}</div>
            <div style="font-size:11px;color:var(--gold);font-weight:700">${fmtN(S.user.score||0)} pts</div>
          </div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="doLogout()">Logout</button>
      </div>`;
    const showAdmin=isMaster();
    ['nav-admin','sb-admin'].forEach(id=>{const e=el(id);if(e)e.style.display=showAdmin?'':'none';});
    tog('btn-create-contest', showAdmin);
  } else {
    area.innerHTML=`<button class="btn btn-primary btn-sm" onclick="openAuth('login')">Sign In</button>`;
    ['nav-admin','sb-admin'].forEach(id=>{const e=el(id);if(e)e.style.display='none';});
    hide('btn-create-contest');
  }
}

function renderSidebar(){
  const live=getVisibleContestsForList().filter(c=>c.status==='live').length;
  el('sb-live-count').textContent=live;
}

function isOwnedByCurrentUser(ownerRef){
  if(!S.user||ownerRef==null)return false;
  const owner=String(ownerRef).trim().toLowerCase();
  const refs=[S.user.userId,S.user.username,S.user.email]
    .filter(Boolean)
    .map(v=>String(v).trim().toLowerCase());
  return refs.includes(owner);
}

function isContestVisibleToCurrentUser(contest){
  return !!contest;
}

function getVisibleContestsForList(){
  return [...S.contests,...S.customContests].filter(isContestVisibleToCurrentUser);
}

function getContestById(contestId){
  return getVisibleContestsForList().find(c=>c.id===contestId)
    || S.contests.find(c=>c.id===contestId)
    || S.customContests.find(c=>c.id===contestId)
    || null;
}

function getEmbargoedProblemIds(){
  const embargoed=new Set();
  [...S.contests,...S.customContests].forEach(c=>{
    // Only explicitly flagged contests should hide practice problems.
    // User-created contests should never remove problems from daily/practice counts.
    if(!c||c.status!=='upcoming'||c.hideInPractice!==true)return;
    (c.problemIds||[]).forEach(pid=>embargoed.add(pid));
  });
  return embargoed;
}

function getPublicPracticeProblems(){
  const embargoed=getEmbargoedProblemIds();
  return S.problems.filter(p=>!embargoed.has(p.id));
}

function ensureContestAccess(contest){
  if(!contest)return false;
  if(contest.isPublic)return true;
  if(isMaster())return true;
  if(isOwnedByCurrentUser(contest.createdBy))return true;
  if(isContestParticipant(contest))return true;
  if(S.unlockedPrivateContests[contest.id])return true;
  if(!S.user){
    toast('Sign in to access private contest','warn');
    openAuth('login');
    return false;
  }
  openContestPasswordModal(contest);
  return false;
}

function openContestPasswordModal(contest){
  if(!contest)return;
  S.pendingContestAccess={contestId:contest.id,action:S.pendingContestAccess?.action||null};
  const msg=el('contest-pass-msg');
  if(msg)msg.textContent=`${contest.title} is private. Enter the contest password to continue.`;
  const inp=el('contest-pass-input');
  if(inp)inp.value='';
  openModal('modal-contest-password');
  if(inp)setTimeout(()=>inp.focus(),20);
}

function closeContestPasswordModal(){
  closeModal('modal-contest-password');
  S.pendingContestAccess=null;
}

function submitContestPassword(){
  const pending=S.pendingContestAccess;
  if(!pending?.contestId){
    closeContestPasswordModal();
    return;
  }
  const contest=getContestById(pending.contestId);
  if(!contest){
    closeContestPasswordModal();
    return;
  }
  const entered=((el('contest-pass-input')||{}).value||'').trim();
  if(!entered){toast('Enter contest password','warn');return;}
  if(String(entered)!==String(contest.password||'')){
    toast('Incorrect contest password','error');
    return;
  }
  S.unlockedPrivateContests[contest.id]=true;
  closeModal('modal-contest-password');
  const action=pending.action;
  S.pendingContestAccess=null;
  if(action?.type==='contest-detail')return nav('contest-detail',action.extra);
  if(action?.type==='judge')return nav('judge',action.extra);
  if(action?.type==='join')return joinContest(action.contestId);
}

function isContestParticipant(contest){
  if(!contest||!S.user)return false;
  if(isMaster())return true;
  if(isOwnedByCurrentUser(contest.createdBy))return true;
  const uid=S.user.userId;
  const participants=Array.isArray(contest.participants)?contest.participants:[];
  if(uid&&participants.includes(uid))return true;
  return S.submissions.some(s=>s.contestId===contest.id);
}

function getContestProblemLockReason(contest){
  if(!contest)return 'Contest not found.';
  if(!hasContestStarted(contest))return `This contest is scheduled for ${fmtDate(contest.startTime)}. Problems will unlock when the contest starts.`;
  if(contest.status!=='ended'&&!isContestParticipant(contest))return 'Only participants can view problems while the contest is live.';
  return '';
}

function normalizeContestLifecycle(contest){
  if(!contest)return contest;
  const nowTs=Date.now();
  if(contest.status==='upcoming'&&nowTs>contest.startTime)contest.status='live';
  if(contest.status==='live'&&nowTs>contest.endTime)contest.status='ended';
  if(contest.status==='ended'){
    contest.isPublic=true;
    contest.password='';
  }
  return contest;
}

function canRevealContestProblems(contest){
  if(!contest)return false;
  if(isAdmin())return true;
  if(!hasContestStarted(contest))return false;
  if(contest.status==='ended')return true;
  if(isOwnedByCurrentUser(contest.createdBy))return true;
  return isContestParticipant(contest);
}

function persistContestEntity(updatedContest){
  if(!updatedContest)return;
  const updateIn=(arr)=>{
    const i=arr.findIndex(c=>c.id===updatedContest.id);
    if(i>=0){arr[i]=updatedContest;return true;}
    return false;
  };
  if(!updateIn(S.contests))updateIn(S.customContests);
  LS.set('contests',S.contests.map(({announce,...r})=>r));
  LS.set('customContests',S.customContests);
  if(S.user?.userId){
    const mine=S.customContests.filter(c=>isOwnedByCurrentUser(c.createdBy));
    LS.set(`custom:${S.user.userId}`,mine);
  }
  syncContestToRelational(updatedContest).catch(err=>console.warn('Background contest sync failed:',err));
}

function joinContest(contestId){
  if(!S.user){toast('Please sign in to participate','warn');openAuth('login');return;}
  const contest=getContestById(contestId);
  if(!contest)return;
  S.pendingContestAccess={contestId:contest.id,action:{type:'join',contestId:contest.id}};
  if(!ensureContestAccess(contest))return;
  S.pendingContestAccess=null;
  const uid=S.user.userId;
  const participants=new Set(Array.isArray(contest.participants)?contest.participants:[]);
  participants.add(uid);
  const updated={...contest,participants:[...participants]};
  persistContestEntity(updated);
  toast('Joined contest as participant','success');
  renderContestDetail(contest.id);
}

/* ══════════════════════════════════════════════════════════
   HOME
══════════════════════════════════════════════════════════ */
function renderHome(){
  const solved=getSolvedIds();
  const publicProblems=getPublicPracticeProblems();
  const total=publicProblems.length;

  el('home-greeting').textContent=S.user?`Welcome back, ${S.user.username}`:'Welcome to BeSQL';
  el('home-sub').textContent=S.user?`${S.user.role.toUpperCase()} · ${fmtN(S.user.score||0)} points`:'Sign in to compete';

  // Stats
  el('home-stats').innerHTML=[
    {l:'Problems',v:total,c:'var(--ind)'},
    {l:'Your Solved',v:solved.size,c:'var(--grn)'},
    {l:'Live Contests',v:getVisibleContestsForList().filter(c=>c.status==='live').length,c:'var(--rose)'},
    {l:'Your Rank',v:getUserRank(),c:'var(--gold)'},
  ].map(s=>`<div class="stat"><div style="font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:var(--t3);margin-bottom:7px">${s.l}</div><div class="stat-v" style="color:${s.c}">${s.v}</div></div>`).join('');

  // Active contests
  const active=getVisibleContestsForList().filter(c=>c.status==='live'||c.status==='upcoming').slice(0,4);
  el('home-contests').innerHTML=active.length?active.map(c=>`
    <div style="display:flex;align-items:center;gap:12px;padding:11px 15px;border-bottom:1px solid var(--line);cursor:pointer;transition:background .1s" onmouseenter="this.style.background='var(--bg2)'" onmouseleave="this.style.background=''" onclick="nav('contest-detail','${c.id}')">
      ${c.status==='live'?'<div class="live-dot"></div>':'<span style="font-size:14px"></span>'}
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;color:var(--t0);font-weight:500" class="trunc">${esc(c.title)}</div>
        <div style="font-size:11px;color:var(--t2);margin-top:2px">${c.status==='live'?'In progress':fmtDate(c.startTime)} · ${c.problemIds.length} problems</div>
      </div>
      ${c.status==='live'?'<span class="live-pill"><div class="live-dot" style="width:6px;height:6px"></div>LIVE</span>':''}
    </div>`).join(''):'<div class="empty"><div class="empty-ico"></div><div style="font-size:12px;color:var(--t3)">No active contests</div></div>';

  // Daily problem
  const daily=publicProblems.find(p=>p.dailyDate===getTodayStr())||publicProblems[0];
  el('daily-badge').className=daily?diffCls(daily.difficulty):'diff-easy';
  el('home-daily').innerHTML=daily?`
    <div style="font-size:17px;font-weight:800;margin-bottom:6px">${esc(daily.title)}</div>
    <div style="font-size:12px;color:var(--t1);line-height:1.7;margin-bottom:12px">${esc(daily.description.slice(0,140))}${daily.description.length>140?'...':''}</div>
    <div class="fx ic gap3">
      <div class="fx gap2 flex-wrap">${daily.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div>
      <button class="btn btn-blue btn-md" onclick="nav('judge',{problemId:'${daily.id}',backView:'home'})">Solve →</button>
    </div>`:'<div class="empty"><div class="empty-ico" style="font-size:14px;color:var(--t3)">—</div></div>';

  // Mini scoreboard
  const lb=buildLeaderboard().slice(0,8);
  el('home-scoreboard').innerHTML=lb.map((p,i)=>`
    <div class="fx ic gap2 ${i===0?'sb-rank-gold':i===1?'sb-rank-silver':i===2?'sb-rank-bronze':''} ${S.user&&p.userId===S.user.userId?'sb-me':''}" style="padding:9px 14px;border-bottom:1px solid var(--line)">
      <div class="rm ${i===0?'rm1':i===1?'rm2':i===2?'rm3':'rmn'}">${i+1}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;color:${S.user&&p.userId===S.user.userId?'var(--ind)':'var(--t0)'}" class="trunc">${esc(p.username)}</div>
        <div style="font-size:10px;color:var(--t3)">${p.solved} solved</div>
      </div>
      <div style="font-size:14px;font-weight:800;color:var(--gold)">${fmtN(p.score)}</div>
    </div>`).join('')||'<div class="empty"><div class="empty-ico"></div></div>';

  // Progress card
  const pct=total?Math.round(solved.size/total*100):0;
  el('home-progress').innerHTML=`
    <div style="margin-bottom:14px">
      <div class="fx ic sb mb1" style="font-size:11px;color:var(--t2)"><span>OVERALL PROGRESS</span><span>${solved.size}/${total}</span></div>
      <div class="pbar"><div class="pfill" style="width:${pct}%;background:var(--ind)"></div></div>
    </div>
    ${['Easy','Medium','Hard','Expert'].map(d=>{
      const dp=publicProblems.filter(p=>p.difficulty===d);
      const ds=dp.filter(p=>solved.has(p.id)).length;
      const dp2=Math.round(dp.length?ds/dp.length*100:0);
      const color=d==='Easy'?'var(--grn)':d==='Medium'?'var(--gold)':d==='Hard'?'var(--rose)':'var(--violet)';
      return `<div style="margin-bottom:10px"><div class="fx ic sb mb1"><span class="${diffCls(d)}">${d}</span><span style="font-size:11px;color:var(--t2)">${ds}/${dp.length}</span></div><div class="pbar"><div class="pfill" style="width:${dp2}%;background:${color}"></div></div></div>`;
    }).join('')}`;
}

function getUserRank(){
  if(!S.user) return '—';
  const lb=buildLeaderboard();
  const i=lb.findIndex(e=>e.userId===S.user.userId);
  return i>=0?`#${i+1}`:'—';
}

function buildLeaderboard(){
  const userKeys=LS.keys('user:');
  const users=userKeys.map(k=>LS.get(k)).filter(u=>u&&u.userId);
  return users.map(u=>({userId:u.userId,username:u.username,score:u.score||0,solved:u.solved||0,role:u.role})).sort((a,b)=>b.score-a.score);
}

/* ══════════════════════════════════════════════════════════
   CONTESTS
══════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════
   JUDGE (Problem Solver)
══════════════════════════════════════════════════════════ */
function renderJudge(ctx){
  if(!ctx){nav('home');return;}
  const prevCtx=S.judgeContext;
  if(prevCtx?.problemId)saveJudgeSessionState(prevCtx);
  S.judgeContext=ctx;
  const p=S.problems.find(x=>x.id===ctx.problemId);
  if(!p){toast('Problem not found','error');nav(ctx.backView||'home');return;}

  el('judge-back-btn').onclick=()=>nav(ctx.backView||'home',ctx.contestId);
  el('judge-diff').textContent=p.difficulty;
  el('judge-diff').className=diffCls(p.difficulty);
  el('judge-pts').textContent=`+${p.points}`;
  el('judge-title').textContent=p.title;
  const codeEl=el('judge-code');
  if(codeEl)codeEl.textContent=p.code||p.id.toUpperCase();

  // Recover missing sample output at runtime from the reference solution.
  const effectiveSampleOutput=normalizeSampleOutput(p.sampleOutput,p.solution);
  if(effectiveSampleOutput&&!p.sampleOutput){
    p.sampleOutput=effectiveSampleOutput;
    persistProblems();
  }

  // Build rich problem description with sample output + schema
  let descHTML=`<div style="font-size:13px;color:var(--t1);line-height:1.8;white-space:pre-line">${esc(p.description)}</div>`;

  // Sample output table
  if(effectiveSampleOutput&&effectiveSampleOutput.columns){
    const so=effectiveSampleOutput;
    descHTML+=`<div class="prob-section">
      <div class="prob-section-title">Sample Output</div>
      <div style="overflow-x:auto"><table class="sample-table">
        <thead><tr>${so.columns.map(col=>`<th>${esc(col)}</th>`).join('')}</tr></thead>
        <tbody>${so.rows.map(row=>`<tr>${row.map(cell=>`<td>${esc(String(cell))}</td>`).join('')}</tr>`).join('')}</tbody>
      </table></div>
      <div style="font-size:11px;color:var(--t3);margin-top:5px">Sample rows only — your query must return all matching rows.</div>
    </div>`;
  }

  // Schema reference with sample data
  if(p.schemaHint){
    const sh=p.schemaHint;
    const tableNames=sh.table.split('·').map(t=>t.trim());
    const tableDataHtml=tableNames.map(tname=>{
      const data=DB[tname.toLowerCase()];
      if(!data||!data.length)return '';
      const cols=Object.keys(data[0]);
      return `<div style="margin-bottom:12px">
        <div style="font-size:11px;font-weight:700;color:var(--grn);font-family:var(--mono);margin-bottom:4px">${esc(tname)}</div>
        <div style="overflow-x:auto"><table class="schema-table" style="font-size:11px">
          <thead><tr>${cols.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead>
          <tbody>${data.map(row=>`<tr>${cols.map(c=>`<td>${row[c]==null?'<span class="tbl-null">NULL</span>':esc(String(row[c]))}</td>`).join('')}</tr>`).join('')}</tbody>
        </table></div>
      </div>`;
    }).join('');
    descHTML+=`<div class="prob-section">
      <div class="prob-section-title">Sample Data: <span style="color:var(--grn);font-family:var(--mono);font-size:11px">${esc(sh.table)}</span></div>
      ${tableDataHtml}
    </div>`;
  }

  // Always show available tables summary so users know what's in the DB
  descHTML+=`<div class="prob-section">
    <div class="prob-section-title">Available Tables</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">
      ${[
        {name:'employees',cols:'id, name, dept_id, salary, hire_year, age, level'},
        {name:'departments',cols:'id, name, budget, location, headcount'},
        {name:'orders',cols:'id, customer, product_id, amount, status, month'},
        {name:'products',cols:'id, name, category, price, stock'},
        {name:'students',cols:'id, name, grade, course_id, year, gpa'},
        {name:'courses',cols:'id, name, credits, instructor, dept'},
      ].map(t=>`<div style="background:var(--bg2);border:1px solid var(--line2);border-radius:5px;padding:7px 10px;min-width:0">
        <div style="font-size:11px;font-weight:700;color:var(--grn);font-family:var(--mono);margin-bottom:3px">${t.name}</div>
        <div style="font-size:10.5px;color:var(--t3);font-family:var(--mono);line-height:1.6">${t.cols}</div>
      </div>`).join('')}
    </div>
  </div>`;

  el('judge-desc').innerHTML=descHTML;
  el('judge-tags').innerHTML=p.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('');

  // Test cases — hidden-only to prevent hardcoding against visible checks
  const publicCases=p.testCases.filter(tc=>!tc.hidden);
  const hiddenCount=p.testCases.length-publicCases.length;
  el('tc-list').innerHTML=publicCases.length?publicCases.map((tc,i)=>`
    <div class="tc-row tc-pending mb2" id="tc-row-${tc.id}">
      <span style="font-size:10px;font-weight:700;color:var(--t3);font-family:var(--mono);width:22px;flex-shrink:0;text-align:center">${i+1}</span>
      <span style="flex:1;font-size:12px;color:var(--t1)">Test Case ${i+1}</span>
      <span style="font-size:14px;font-weight:700;font-family:var(--mono);color:var(--t3);width:20px;text-align:center" id="tc-status-${tc.id}">–</span>
    </div>`).join(''):`<div class="tc-row" style="border-left-color:var(--ind);background:var(--idim)">
      <span style="font-size:11px;color:var(--ind);font-weight:600">Hidden evaluator active: ${hiddenCount} private test cases</span>
    </div>`;
  el('tc-summary').textContent=`${publicCases.length} public · ${hiddenCount} hidden`;

  // Previous submission (editor value set in bind editor section below)
  const prevSub=S.submissions
    .filter(s=>s.problemId===p.id&&(ctx?.contestId?s.contestId===ctx.contestId:true))
    .sort((a,b)=>b.at-a.at)[0];
  const sessionState=getJudgeSessionState(ctx);
  clearJudgeState();

  // Timer removed for SQL editor (no per-problem timing in editor view)

  // Initialize CodeMirror editor with schema from problem
  const initialCode=(sessionState&&typeof sessionState.draft==='string')?sessionState.draft:(prevSub?.code||'');
  const schema={};
  if(p.schemaHint?.table){
    schema[p.schemaHint.table]=p.schemaHint.columns.map(c=>c[0]);
  }
  if(!window.judgeEditor){
    window.judgeEditor=Object.create(window.BeSQLEditor);
  }
  window.judgeEditor.init({
    container:el('judge-editor'),
    dialect:'sqlite',
    schema,
    initialValue:initialCode,
    readOnly:false,
    onRun:(sql)=>judgeRun(),
    minHeight:200,
  });
  const judgeCharsEl=el('judge-chars');
  if(judgeCharsEl)judgeCharsEl.textContent=`${initialCode.length}`;

  // Solved state
  const isSolved=isSolvedForJudgeContext(p.id,S.judgeContext);
  el('btn-judge-submit').disabled=isSolved;
  el('btn-judge-submit').textContent=isSolved?'Solved':'Submit';
  updateJudgeNextButton();
}

function judgeEditorClear(){
  if(window.judgeEditor)window.judgeEditor.setValue('');
  const judgeCharsEl=el('judge-chars');
  if(judgeCharsEl)judgeCharsEl.textContent='0';
  saveJudgeSessionState(S.judgeContext,{draft:''});
  clearJudgeState();
  const p=S.problems.find(x=>x.id===S.judgeContext?.problemId);
  if(p)p.testCases.forEach(tc=>resetTC(tc.id));
}

function resetTC(tcId){
  const row=el(`tc-row-${tcId}`);
  const ico=el(`tc-status-${tcId}`);
  if(row)row.className='tc-row tc-pending mb2';
  if(ico){ico.textContent='–';ico.style.color='var(--t3)';}
}
function clearJudgeState(){
  // Fully reset ALL judge panel state when loading a new problem
  const verdict=el('judge-verdict');
  const feedback=el('judge-feedback');
  const result=el('judge-result');
  const rowCount=el('judge-row-count');
  const tcSummary=el('tc-summary');
  if(verdict)verdict.innerHTML='';
  if(feedback){feedback.innerHTML='';feedback.classList.add('hidden');}
  if(result){result.innerHTML='';result.classList.add('hidden');}
  if(rowCount)rowCount.textContent='';
  if(tcSummary)tcSummary.textContent='— test cases';
}

function getJudgeProblemSequence(ctx){
  if(!ctx)return [];
  if(ctx.contestId){
    const contest=getContestById(ctx.contestId);
    if(!contest||!Array.isArray(contest.problemIds))return [];
    return contest.problemIds.map(pid=>S.problems.find(p=>p.id===pid)).filter(Boolean);
  }
  if(ctx.backView==='practice'){
    const publicProblems=getPublicPracticeProblems();
    if(S.practiceFilter&&S.practiceFilter!=='All'){
      return publicProblems.filter(p=>p.difficulty===S.practiceFilter);
    }
    return [...publicProblems];
  }
  if(ctx.backView==='home'){
    const today=getTodayStr();
    const publicProblems=getPublicPracticeProblems();
    const daily=publicProblems.filter(p=>p.dailyDate===today);
    return daily.length?daily:[...publicProblems];
  }
  return [...S.problems];
}

function getNextJudgeProblem(ctx){
  if(!ctx)return null;
  const seq=getJudgeProblemSequence(ctx);
  if(!seq.length)return null;
  const idx=seq.findIndex(p=>p.id===ctx.problemId);
  if(idx<0||idx>=seq.length-1)return null;
  return seq[idx+1];
}

function getPreviousJudgeProblem(ctx){
  if(!ctx)return null;
  const seq=getJudgeProblemSequence(ctx);
  if(!seq.length)return null;
  const idx=seq.findIndex(p=>p.id===ctx.problemId);
  if(idx<=0)return null;
  return seq[idx-1];
}

function moveToPreviousJudgeProblem(){
  const ctx=S.judgeContext;
  if(!ctx)return;
  const prev=getPreviousJudgeProblem(ctx);
  if(!prev){toast('No previous problem in this track','info');return;}
  nav('judge',{
    problemId:prev.id,
    contestId:ctx.contestId||null,
    backView:ctx.backView||'practice',
  });
}

function moveToNextJudgeProblem(){
  const ctx=S.judgeContext;
  if(!ctx)return;
  const next=getNextJudgeProblem(ctx);
  if(!next){toast('No next problem in this track','info');return;}
  nav('judge',{
    problemId:next.id,
    contestId:ctx.contestId||null,
    backView:ctx.backView||'practice',
  });
}

function updateJudgeNextButton(){
  const prevBtn=el('btn-judge-prev');
  if(prevBtn){
    const prev=getPreviousJudgeProblem(S.judgeContext||{});
    prevBtn.style.display=prev?'inline-flex':'none';
    prevBtn.onclick=prev?moveToPreviousJudgeProblem:null;
  }
  const btn=el('btn-judge-next');
  if(!btn)return;
  const next=getNextJudgeProblem(S.judgeContext||{});
  btn.style.display=next?'inline-flex':'none';
  btn.onclick=next?moveToNextJudgeProblem:null;
}

function resetJudgeExecutionState(problem){
  const verdict=el('judge-verdict');
  const feedback=el('judge-feedback');
  if(verdict)verdict.innerHTML='';
  if(feedback){
    feedback.innerHTML='';
    feedback.classList.add('hidden');
  }
  if(problem?.testCases){
    problem.testCases.forEach(tc=>resetTC(tc.id));
    const publicTotal=problem.testCases.filter(tc=>!tc.hidden).length;
    const hiddenCount=problem.testCases.length-publicTotal;
    const summary=el('tc-summary');
    if(summary)summary.textContent=`${publicTotal} public · ${hiddenCount} hidden`;
  }
}

function judgeRun(){
  const p=S.problems.find(x=>x.id===S.judgeContext?.problemId);
  if(!p)return;
  const sql=window.judgeEditor?window.judgeEditor.getValue():'';
  if(!sql.trim()){toast('Write a query first','warn');return;}
  resetJudgeExecutionState(p);
  el('btn-judge-run').textContent='Running...'; el('btn-judge-run').disabled=true;

  setTimeout(()=>{
    const result=runSQL(sql,DB);
    showJudgeResult(result);
    runTestCases(p,result,false);
    el('btn-judge-run').textContent='Run & Test'; el('btn-judge-run').disabled=false;
  },120);
}

function runTestCases(p,result,isSubmit){
  let passed=0;
  let publicPassed=0;
  const publicTotal=p.testCases.filter(tc=>!tc.hidden).length;
  p.testCases.forEach(tc=>{
    const row=el(`tc-row-${tc.id}`);
    const ico=el(`tc-status-${tc.id}`);
    if(result.error){
      if(row){
        row.className='tc-row tc-fail mb2';
        if(ico){ico.textContent='✗';ico.style.color='var(--rose)';}
      }
      return;
    }
    const ok=tc.validate(result);
    if(ok)passed++;
    if(!tc.hidden&&ok)publicPassed++;
    if(row){
      row.className=`tc-row ${ok?'tc-pass':'tc-fail'} mb2`;
      if(ico){ico.textContent=ok?'✓':'✗';ico.style.color=ok?'var(--grn)':'var(--rose)';}
    }
  });
  let canonicalPass=false;
  if(!result.error&&p?.solution){
    const ref=runSQL(p.solution,DB);
    canonicalPass=Boolean(ref&&!ref.error&&resultsMatch(result,ref,{requireColumnNames:false,ignoreRowOrder:true}));
  }
  if(canonicalPass&&passed<p.testCases.length){
    passed=p.testCases.length;
    publicPassed=publicTotal;
    p.testCases.forEach(tc=>{
      const row=el(`tc-row-${tc.id}`);
      const ico=el(`tc-status-${tc.id}`);
      if(row){
        row.className='tc-row tc-pass mb2';
        if(ico){ico.textContent='✓';ico.style.color='var(--grn)';}
      }
    });
  }
  let sampleOk=true;
  if(!result.error&&p?.sampleOutput){
    sampleOk=matchesSampleOutput(result,p.sampleOutput);
  }
  if(canonicalPass)sampleOk=true;
  const baseSummary=publicTotal
    ? `${publicPassed}/${publicTotal} public · ${passed}/${p.testCases.length} total`
    : `Hidden tests: ${passed}/${p.testCases.length} passed`;
  el('tc-summary').textContent=p?.sampleOutput
    ? `${baseSummary} · sample ${sampleOk?'✓':'✗'}`
    : baseSummary;
  return {
    allPassed: passed===p.testCases.length&&sampleOk,
    passed,
    publicPassed,
    publicTotal,
    sampleOk,
  };
}

function showJudgeResult(result){
  const panel=el('judge-result');
  el('judge-row-count').textContent=result.error?'':(`${result.rowCount} rows`);
  if(result.error){
    panel.innerHTML=`<div class="res-panel"><div class="res-hdr"><span style="color:var(--rose);font-weight:600">SQL ERROR</span></div><div style="padding:10px 12px;font-family:var(--mono);font-size:12px;color:var(--rose)">${esc(result.error)}</div></div>`;
  } else if(!result.columns.length){
    panel.innerHTML=`<div class="res-panel"><div class="res-hdr"><span style="color:var(--t2)">NO ROWS</span></div></div>`;
  } else {
    panel.innerHTML=`<div class="res-panel"><div class="res-hdr"><span style="color:var(--grn);font-weight:600">QUERY RESULT</span><span style="color:var(--t2)">${result.rowCount} rows · ${result.columns.length} cols</span></div><div class="res-body"><div class="tw"><table class="tbl"><thead><tr>${result.columns.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${result.rows.slice(0,50).map((row,i)=>`<tr style="animation:rowIn .12s ease ${i*.015}s both">${row.map(cell=>`<td>${cell===null?'<span class="tbl-null">NULL</span>':esc(String(cell))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${result.rowCount>50?`<div style="padding:7px 12px;font-size:11px;color:var(--t3)">Showing 50/${result.rowCount}</div>`:''}</div></div>`;
  }
  show(panel);
}

function judgeSubmit(){
  if(!S.user){toast('Please sign in to submit','error');return;}
  const p=S.problems.find(x=>x.id===S.judgeContext?.problemId);
  if(!p)return;
  const effectiveContestId=getEffectiveSubmissionContestId(S.judgeContext);
  if(isContestReattemptBlocked(p.id,effectiveContestId)){
    el('btn-judge-submit').disabled=true;
    el('btn-judge-submit').textContent='Solved';
    toast('Already solved in this contest. Reattempt is disabled.','info');
    return;
  }
  const sql=window.judgeEditor?window.judgeEditor.getValue():'';
  if(!sql.trim()){toast('Write a query first','warn');return;}
  resetJudgeExecutionState(p);
  el('btn-judge-submit').disabled=true; el('btn-judge-submit').textContent='Judging...';

  setTimeout(()=>{
    const result=runSQL(sql,DB);
    showJudgeResult(result);
    const testSummary=runTestCases(p,result,true);

    // Determine verdict
    let verdict='WA';
    if(result.error) verdict='CE';
    else if(testSummary.allPassed) verdict='AC';

    if(isContestReattemptBlocked(p.id,effectiveContestId)){
      el('btn-judge-submit').disabled=true;
      el('btn-judge-submit').textContent='Solved';
      toast('Already solved in this contest. Reattempt is disabled.','info');
      return;
    }

    // Check if already solved BEFORE adding new submission
    const alreadySolved=getSolvedIds().has(p.id);

    // Record submission
    const sub={
      id:genId(), userId:S.user.userId, problemId:p.id,
      contestId:effectiveContestId,
      code:sql, verdict, timeTaken:S.judgeElapsed,
      at:Date.now(), tcPassed:testSummary.passed,
      tcTotal:p.testCases.length,
      publicPassed:testSummary.publicPassed,
      publicTotal:testSummary.publicTotal,
      isSubmitted:true,
      submittedVia:'submit-button',
    };
    S.submissions.unshift(sub);
    LS.set(`subs:${S.user.userId}`,S.submissions);
    // Save editor state with submission
    saveJudgeSessionState(S.judgeContext,{draft:sql});

    // Update user score — only if this is the FIRST acceptance
    if(verdict==='AC'&&!alreadySolved){
      const bonus=S.judgeElapsed<60?50:S.judgeElapsed<120?30:S.judgeElapsed<300?10:0;
      S.user.score=(S.user.score||0)+p.points+bonus;
      S.user.solved=(S.user.solved||0)+1;
      LS.set(`user:${S.user.username}`,S.user);
      clearInterval(S.judgeTimer);
    }

    // Show verdict
    const vColor=verdict==='AC'?'var(--grn)':verdict==='CE'?'var(--violet)':'var(--rose)';
    el('judge-verdict').innerHTML=`<div style="display:flex;align-items:center;gap:8px;padding:6px 12px;border-radius:5px;background:${vColor}18;border:1px solid ${vColor}44">
      <span style="color:${vColor};font-size:15px;font-weight:800">${verdict}</span>
      <span style="font-size:11px;color:var(--t2)">${sub.publicPassed}/${sub.publicTotal} public · ${sub.tcPassed}/${sub.tcTotal} total</span>
    </div>`;

    const fb=el('judge-feedback');
    fb.innerHTML=`<div class="fx ic gap2" style="padding:10px 14px;border-radius:5px;background:${vColor}10;border:1px solid ${vColor}30">
      <span style="color:${vColor};font-size:16px">${verdict==='AC'?'✓':'✗'}</span>
      <span style="color:${vColor};font-size:12px;font-weight:500">${
        verdict==='AC'?`Accepted! ${sub.publicPassed}/${sub.publicTotal} public tests passed (${sub.tcPassed}/${sub.tcTotal} total).`:
        verdict==='CE'?`Compilation/Runtime Error: ${result.error}`:
        `Wrong Answer — ${sub.publicPassed}/${sub.publicTotal} public tests passed (${sub.tcPassed}/${sub.tcTotal} total).`
      }</span>
    </div>`;
    show(fb);

    if(verdict==='AC'){
      // Always persist user to LS so leaderboard stays fresh
      LS.set(`user:${S.user.username}`, S.user);
      renderTopRight();
      updateJudgeNextButton();
      toast(`Accepted! +${p.points} points`,'success');
      el('btn-judge-submit').textContent='Solved';
    } else {
      el('btn-judge-submit').disabled=false;
      el('btn-judge-submit').textContent='Submit';
      toast(verdict==='CE'?'Error in query':'Wrong answer','error');
    }
  },300);
}

/* ══════════════════════════════════════════════════════════
   CUSTOM CONTESTS
══════════════════════════════════════════════════════════ */
function renderCustom(){
  const mine=S.customContests.filter(c=>isOwnedByCurrentUser(c.createdBy));
  const myCustomProblems=S.problems.filter(p=>p.isCustom&&isOwnedByCurrentUser(p.createdBy));
  const contestHtml=mine.length?mine.map(c=>`<div class="mb3">${contestCardHTML({...c,type:'custom'})}<div class="fx gap2" style="justify-content:flex-end;margin-top:8px"><button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();openCustomCreator('${c.id}')">Edit Contest</button><button class="btn btn-danger btn-sm" onclick="event.stopPropagation();deleteCustomContest('${c.id}')">Delete Contest</button></div></div>`).join(''):`
    <div class="empty"><div class="empty-ico" style="font-size:14px;color:var(--t3)">—</div>
    <div style="font-size:13px;color:var(--t2);margin-bottom:10px">No custom contests yet</div>
    <button class="btn btn-blue btn-md" onclick="openCustomCreator()">Create Your First Contest</button></div>`;
  const customProblemHtml=`<div class="card" style="margin-top:12px"><div class="card-hdr"><div class="card-title">My Custom Problems (${myCustomProblems.length})</div><button class="btn btn-ghost btn-sm" onclick="openProblemEditor()">+ New</button></div><div class="card-body">${myCustomProblems.length?myCustomProblems.map(p=>`<div class="fx ic sb" style="padding:8px 0;border-bottom:1px solid var(--line)"><div><div style="font-size:12px;color:var(--t0)">${esc(p.title)}</div><div style="font-size:10px;color:var(--t3)">${esc(p.code||p.id)}</div></div><div class="fx gap2"><button class="btn btn-ghost btn-xs" onclick="openProblemEditor('${p.id}')">Edit</button><button class="btn btn-danger btn-xs" onclick="deleteProblem('${p.id}')">Del</button></div></div>`).join(''):'<div style="font-size:12px;color:var(--t3)">No custom problems created yet.</div>'}</div></div>`;
  el('custom-my-list').innerHTML=contestHtml+customProblemHtml;
  el('custom-inv-list').innerHTML='<div class="empty"><div class="empty-ico" style="font-size:14px;color:var(--t3)">—</div><div style="font-size:12px;color:var(--t3)">No invitations</div></div>';
}

function canEditProblem(problem){
  if(!S.user)return false;
  if(isMaster())return true;
  if(!problem)return true;
  return problem.isCustom===true&&isOwnedByCurrentUser(problem.createdBy);
}

function openCustomCreator(id){
  if(!S.user){toast('Please sign in first','error');return;}
  const ex=id?S.customContests.find(c=>c.id===id):null;
  if(id&&!ex){toast('Contest not found','error');return;}
  if(ex&&!isOwnedByCurrentUser(ex.createdBy)&&!isMaster()){toast('Permission denied','error');return;}
  S.editingCustomContest=ex?{...ex,_existing:true}:null;
  const c=ex||{title:'',description:'',duration:120,isPublic:false,startTime:Date.now()+3600000,problemIds:[],invitees:[],password:''};
  const startVal=new Date(c.startTime||Date.now()+3600000).toISOString().slice(0,16);
  const selectedIds=new Set(c.problemIds||[]);
  const selectableProblems=getContestSelectableProblems(c.problemIds||[]);
  const modalTitle=el('custom-editor-title');
  const modalBtn=el('custom-editor-save-btn');
  if(modalTitle)modalTitle.textContent=ex?'EDIT CUSTOM CONTEST':'CREATE CUSTOM CONTEST';
  if(modalBtn)modalBtn.textContent=ex?'Save Changes':'Create Contest';
  el('custom-creator-body').innerHTML=`
    <div class="fg"><label class="lbl">Contest Title</label><input class="inp" id="cc-title" value="${esc(c.title||'')}" placeholder="e.g. Study Group Round 1"></div>
    <div class="fg"><label class="lbl">Description</label><textarea class="ta" rows="3" id="cc-desc" placeholder="What is this contest about?">${esc(c.description||'')}</textarea></div>
    <div class="g3">
      <div class="fg"><label class="lbl">Start Time</label><input class="inp" type="datetime-local" id="cc-start" value="${startVal}"></div>
      <div class="fg"><label class="lbl">Duration (minutes)</label><input class="inp" type="number" id="cc-dur" value="${Number(c.duration||120)}"></div>
      <div class="fg"><label class="lbl">Visibility</label><select class="sel" id="cc-vis" onchange="updateContestPrivacyUI()"><option value="private" ${c.isPublic?'':'selected'}>Private (invite only)</option><option value="public" ${c.isPublic?'selected':''}>Public</option></select></div>
    </div>
    <div class="fg" id="cc-pass-wrap"><label class="lbl">Contest Password</label><input class="inp" id="cc-pass" type="password" value="${esc(c.password||'')}" placeholder="Required for private contests"></div>
    <div class="fg">
      <label class="lbl">Add Problem by Code</label>
      <div style="display:flex;gap:8px;margin-bottom:8px">
        <input class="inp" id="cc-code-input" placeholder="e.g. BSQ-001" style="flex:1;font-family:var(--mono)" oninput="this.value=this.value.toUpperCase()" onkeydown="if(event.key==='Enter'){event.preventDefault();ccAddByCode();}">
        <button class="btn btn-ghost btn-sm" onclick="ccAddByCode()">Add</button>
      </div>
      <div id="cc-selected-problems" style="display:flex;flex-direction:column;gap:4px;margin-bottom:8px"></div>
      ${isAdmin()?'':'<div style="font-size:10px;color:var(--t3);margin-bottom:8px">Only admins can add custom problems to contests.</div>'}
      <div style="font-size:10px;color:var(--t3);margin-bottom:5px;font-weight:600;text-transform:uppercase;letter-spacing:.4px">Or pick from list</div>
      <input class="inp search-inp" id="cc-prob-search" value="${esc(S.customContestProblemSearch||'')}" placeholder="Search problems by code, title, tag, category..." oninput="filterCustomContestProblemOptions(this.value)" style="margin-bottom:8px">
      <div style="display:flex;flex-direction:column;gap:4px;max-height:160px;overflow-y:auto">
        ${selectableProblems.map(p=>`
          <label class="cc-prob-option" data-prob-search="${esc(buildProblemSearchText(p))}" style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:6px 10px;border-radius:4px;background:var(--bg2);border:1px solid var(--line)" onclick="setTimeout(ccRefreshSelected,10)">
            <input type="checkbox" class="cc-prob-check" value="${p.id}" id="cc-chk-${p.id}" ${selectedIds.has(p.id)?'checked':''}>
            <span style="font-size:10px;font-family:var(--mono);color:var(--grn);font-weight:700;width:64px;flex-shrink:0">${p.code||p.id.toUpperCase()}</span>
            <span style="flex:1;font-size:12px;color:var(--t1)">${esc(p.title)}</span>
            <span class="${diffCls(p.difficulty)}">${p.difficulty}</span>
            <span style="font-size:11px;color:var(--gold)">${p.points}pt</span>
          </label>`).join('')}
      </div>
    </div>
    <div class="fg"><label class="lbl">Invite Users (comma separated usernames)</label><input class="inp" id="cc-invite" value="${esc((c.invitees||[]).join(', '))}" placeholder="user1, user2, ..."></div>`;
  ccRefreshSelected();
  filterCustomContestProblemOptions(S.customContestProblemSearch||'');
  updateContestPrivacyUI();
  openModal('modal-custom');
}

function filterCustomContestProblemOptions(query){
  S.customContestProblemSearch=String(query||'');
  const q=normalizeSearchQuery(query);
  document.querySelectorAll('#modal-custom .cc-prob-option').forEach(node=>{
    const scope=normalizeSearchQuery(node.getAttribute('data-prob-search')||'');
    const visible=!q||q.split(' ').every(token=>scope.includes(token));
    node.style.display=visible?'flex':'none';
  });
}

function updateContestPrivacyUI(){
  const vis=(el('cc-vis')||{}).value||'private';
  const wrap=el('cc-pass-wrap');
  if(!wrap)return;
  wrap.style.display=vis==='private'?'block':'none';
}

function ccAddByCode(){
  const inp=el('cc-code-input');
  if(!inp)return;
  const code=inp.value.trim().toUpperCase();
  if(!code){toast('Enter a problem code','warn');return;}
  const p=S.problems.find(x=>(x.code||x.id.toUpperCase())===code);
  if(!p){toast(`No problem found: ${code}`,'warn');return;}
  const chk=document.getElementById(`cc-chk-${p.id}`);
  if(chk)chk.checked=true;
  inp.value='';
  ccRefreshSelected();
  toast(`Added: ${p.title}`,'success');
}
function ccRefreshSelected(){
  const checked=[...document.querySelectorAll('.cc-prob-check:checked')];
  const wrap=el('cc-selected-problems');
  if(!wrap)return;
  wrap.innerHTML=checked.length?`<div style="font-size:10px;color:var(--t3);font-weight:600;text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px">Selected (${checked.length})</div>`+checked.map(chk=>{
    const p=S.problems.find(x=>x.id===chk.value);if(!p)return'';
    return `<div style="display:flex;align-items:center;gap:8px;padding:5px 10px;background:var(--gdim);border:1px solid rgba(46,200,102,.2);border-radius:4px">
      <span style="font-size:10px;font-family:var(--mono);color:var(--grn);font-weight:700">${p.code||p.id.toUpperCase()}</span>
      <span style="flex:1;font-size:12px;color:var(--t0)">${esc(p.title)}</span>
      <button class="btn btn-ghost btn-xs" onclick="document.getElementById('cc-chk-${p.id}').checked=false;ccRefreshSelected()">×</button>
    </div>`;
  }).join(''):'';
}
function saveCustomContest(){
  const title=(el('cc-title')||{}).value?.trim();
  if(!title){toast('Enter a title','warn');return;}
  const ids=[...document.querySelectorAll('.cc-prob-check:checked')].map(c=>c.value);
  if(!ids.length){toast('Select at least one problem','warn');return;}
  const isPublic=(el('cc-vis')||{}).value==='public';
  const pass=((el('cc-pass')||{}).value||'').trim();
  const dur=parseInt((el('cc-dur')||{}).value)||120;
  const startTs=new Date((el('cc-start')||{}).value).getTime()||Date.now()+3600000;
  if(!isPublic&&pass.length<4){toast('Private contest password must be at least 4 characters','warn');return;}
  const existing=S.editingCustomContest;
  if(!isAdmin()){
    const prevIds=new Set(Array.isArray(existing?.problemIds)?existing.problemIds:[]);
    const hasUnauthorizedCustom=ids.some(pid=>{
      const prob=S.problems.find(p=>p.id===pid);
      return prob?.isCustom===true&&!prevIds.has(pid);
    });
    if(hasUnauthorizedCustom){toast('Only admin can add custom problems to contests','error');return;}
  }
  const c={
    id:existing?.id||genId(),title,
    description:(el('cc-desc')||{}).value?.trim()||'',
    duration:dur,
    isPublic,
    problemIds:ids,type:'custom',status:'upcoming',
    createdBy:existing?.createdBy||S.user.userId||S.user.username,
    startTime:startTs,endTime:startTs+dur*60000,
    announcement:existing?.announcement||'',
    participants:Array.isArray(existing?.participants)?existing.participants:[S.user.userId],
    invitees:((el('cc-invite')||{}).value||'').split(',').map(u=>u.trim()).filter(Boolean),
    password:isPublic?'':pass,
  };
  if(existing?._existing){
    const idx=S.customContests.findIndex(x=>x.id===c.id);
    if(idx>=0)S.customContests[idx]=c;
    else S.customContests.push(c);
  }else S.customContests.push(c);
  LS.set('customContests',S.customContests);
  LS.set(`custom:${S.user.userId}`,S.customContests);
  syncContestToRelational(c).catch(err=>console.warn('Background custom contest sync failed:',err));
  S.editingCustomContest=null;
  closeModal('modal-custom'); renderCustom();
  toast(existing?._existing?'Custom contest updated!':'Custom contest created!','success');
}

function deleteCustomContest(id){
  const contest=S.customContests.find(c=>c.id===id);
  if(!contest){toast('Contest not found','error');return;}
  if(!isOwnedByCurrentUser(contest.createdBy)&&!isMaster()){
    toast('Permission denied','error');
    return;
  }
  if(!confirm('Delete this contest? This cannot be undone.'))return;
  S.customContests=S.customContests.filter(c=>c.id!==id);
  LS.set('customContests',S.customContests);
  if(S.user?.userId){
    const mine=S.customContests.filter(c=>isOwnedByCurrentUser(c.createdBy));
    LS.set(`custom:${S.user.userId}`,mine);
  }
  deleteContestFromRelational(id).catch(err=>console.warn('Background custom contest delete sync failed:',err));
  renderCustom();
  renderContests();
  renderSidebar();
  toast('Custom contest deleted','info');
}

function customTab(tab,btn){
  document.querySelectorAll('#view-custom .tab-btn').forEach(b=>b.classList.remove('on'));
  ['my','invited'].forEach(t=>el(`custom-tab-${t}`).classList.add('hidden'));
  btn.classList.add('on'); el(`custom-tab-${tab}`).classList.remove('hidden');
}

/* ══════════════════════════════════════════════════════════
   PRACTICE
══════════════════════════════════════════════════════════ */
function renderPractice(){
  const solved=getSolvedIds();
  const publicProblems=getPublicPracticeProblems();

  const diffs=['All','Easy','Medium','Hard','Expert'];
  el('practice-filters').innerHTML=diffs.map(d=>`
    <button class="btn btn-sm ${S.practiceFilter===d?'btn-blue':'btn-ghost'}" onclick="setPracticeFilter('${d}')">${d}</button>`).join('');

  const byDifficulty=S.practiceFilter==='All'?publicProblems:publicProblems.filter(p=>p.difficulty===S.practiceFilter);
  const filtered=byDifficulty.filter(p=>problemMatchesQuery(p,S.practiceSearch));
  el('practice-problem-list').innerHTML=`<div class="card" style="margin-bottom:10px"><div class="card-body" style="padding:10px"><input id="practice-search-input" class="inp search-inp" value="${esc(S.practiceSearch||'')}" placeholder="Search problems by code, title, tags, category..." oninput="setPracticeSearch(this.value)"></div></div><div class="card">${filtered.map((p,i)=>`
    <div class="prob-row ${solved.has(p.id)?'solved':''}" onclick="nav('judge',{problemId:'${p.id}',backView:'practice'})">
      <div class="prob-num" style="width:28px">${i+1}</div>
      <div style="flex:1;min-width:0">
        <div class="fx ic gap2">
          <span style="font-size:10px;font-family:var(--mono);font-weight:700;color:var(--t3)">${p.code||p.id.toUpperCase()}</span><span style="font-size:13px;color:${solved.has(p.id)?'var(--grn)':'var(--t0)'}">${esc(p.title)}</span>
          ${p.dailyDate===getTodayStr()?'<span style="font-size:9px;padding:1px 5px;border-radius:3px;background:var(--gdim);color:var(--grn);border:1px solid rgba(46,200,102,.2);font-weight:700">TODAY</span>':''}
        </div>
        <div class="fx gap2 mt1">${p.tags.slice(0,3).map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div>
      </div>
      <div class="fx ic gap3">
        <span class="${diffCls(p.difficulty)}">${p.difficulty}</span>
        <span style="font-size:12px;color:var(--gold);font-weight:700">${p.points}pt</span>
        <span style="font-size:12px;color:var(--t3)">${p.testCases.filter(tc=>!tc.hidden).length} tests</span>
        ${solved.has(p.id)?'<span style="color:var(--grn);font-weight:700;font-size:11px">AC</span>':''}
      </div>
    </div>`).join('')||'<div class="empty"><div class="empty-ico" style="font-size:14px;color:var(--t3)">—</div><div style="font-size:12px;color:var(--t3)">No problems match your search</div></div>'}</div>`;

  // Diff stats
  el('practice-diff-stats').innerHTML=['Easy','Medium','Hard','Expert'].map(d=>{
    const dp=publicProblems.filter(p=>p.difficulty===d);
    const ds=dp.filter(p=>solved.has(p.id)).length;
    const pct=dp.length?Math.round(ds/dp.length*100):0;
    const color=d==='Easy'?'var(--grn)':d==='Medium'?'var(--gold)':d==='Hard'?'var(--rose)':'var(--violet)';
    return `<div style="margin-bottom:12px"><div class="fx ic sb mb1"><span class="${diffCls(d)}">${d}</span><span style="font-size:11px;color:var(--t2)">${ds}/${dp.length}</span></div><div class="pbar"><div class="pfill" style="width:${pct}%;background:${color}"></div></div></div>`;
  }).join('');

}
function renderPlayground(){
  // Initialize practice lab editor on first load
  if(!window.practiceLabEditor){
    window.practiceLabEditor=Object.create(window.BeSQLEditor);
    window.practiceLabEditor.init({
      container:el('practice-lab-editor'),
      dialect:'sqlite',
      schema:{},
      initialValue:'',
      readOnly:false,
      onRun:()=>runPracticeLab(),
      minHeight:200,
    });
  }
  renderPracticeLabTables();
  renderPracticeLabTasks();
}
function setPracticeFilter(f){S.practiceFilter=f;renderPractice();}
function setPracticeSearch(q){
  const value=String(q||'');
  const pos=((document.activeElement||{}).selectionStart);
  S.practiceSearch=value;
  renderPractice();
  preserveInputFocusAfterRender('practice-search-input',value,Number.isFinite(pos)?pos:value.length);
}

/* ══════════════════════════════════════════════════════════
   SUBMISSIONS
══════════════════════════════════════════════════════════ */
function renderSubmissions(){
  const filter=(el('sub-filter-verdict')||{}).value||'all';
  const scopedSubs=S.submissions.filter(isCountableSubmission);
  const subs=filter==='all'?scopedSubs:scopedSubs.filter(s=>s.verdict===filter);
  el('sub-list').innerHTML=subs.length?subs.map(s=>{
    const p=S.problems.find(x=>x.id===s.problemId);
    const vcolor=s.verdict==='AC'?'var(--grn)':s.verdict==='WA'?'var(--rose)':s.verdict==='TLE'?'var(--gold)':'var(--violet)';
    return `<div class="sub-row">
      <span style="font-size:10px;color:var(--t3);width:130px;flex-shrink:0">${new Date(s.at).toLocaleString()}</span>
      <span style="flex:1;min-width:0" class="trunc">${esc(p?.title||s.problemId)}</span>
      <span class="${diffCls(p?.difficulty||'Easy')}" style="flex-shrink:0">${p?.difficulty||'?'}</span>
      <span style="color:${vcolor};font-weight:700;font-size:11px;width:40px;text-align:center;flex-shrink:0">${s.verdict}</span>
      <span style="font-size:11px;color:var(--t3);width:60px;text-align:right;flex-shrink:0">${s.tcPassed}/${s.tcTotal} TC</span>
      <span style="font-size:11px;color:var(--t3);width:40px;text-align:right;flex-shrink:0">${s.timeTaken}s</span>
    </div>`;}).join(''):'<div class="empty"><div class="empty-ico" style="font-size:14px;color:var(--t3)">—</div><div style="font-size:12px;color:var(--t3)">No submissions yet</div></div>';
}

/* ══════════════════════════════════════════════════════════
   PROFILE
══════════════════════════════════════════════════════════ */
function renderProfile(){
  if(!S.user){el('profile-content').innerHTML='<div class="empty" style="padding-top:80px"><div style="font-size:15px;color:var(--t2);margin-bottom:14px">Sign in to view your profile</div><button class="btn btn-primary btn-md" onclick="openAuth()">Sign In</button></div>';return;}
  const u=S.user;
  const scopedSubs=S.submissions.filter(isCountableSubmission);
  const solved=getSolvedIds();
  const rank=buildLeaderboard().findIndex(e=>e.userId===u.userId)+1;
  el('profile-content').innerHTML=`
    <div style="display:flex;align-items:center;gap:20px;padding:22px;background:var(--bg1);border:1px solid var(--line);border-radius:10px;margin-bottom:16px">
      <div style="width:60px;height:60px;border-radius:10px;background:var(--bg3);border:2px solid var(--ind);display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:900;color:var(--grn)">${esc(u.username[0].toUpperCase())}</div>
      <div style="flex:1">
        <div style="font-size:24px;font-weight:900;letter-spacing:2px">${esc(u.username)}</div>
        <div class="fx ic gap3 mt1">${roleBadge(u.role)}<span style="font-size:11px;color:var(--t3)">Member since ${new Date(u.joinedAt||Date.now()).toLocaleDateString()}</span></div>
      </div>
      ${rank>0?`<div style="text-align:center"><div style="font-size:28px;font-weight:700;color:var(--gold);line-height:1;font-variant-numeric:tabular-nums">#${rank}</div><div style="font-size:10px;color:var(--t3);letter-spacing:1px">GLOBAL RANK</div></div>`:''}
    </div>
    <div class="g4 mb4">
      ${[['SCORE',fmtN(u.score||0),'var(--gold)'],['SOLVED',u.solved||0,'var(--grn)'],['SUBMISSIONS',scopedSubs.length,'var(--ind)']].map(([l,v,c])=>`<div class="stat"><div class="stat-v" style="color:${c}">${v}</div><div class="stat-l">${l}</div></div>`).join('')}
    </div>
    <div class="g2">
      <div class="card">
        <div class="card-hdr"><div class="card-title">Solved Problems</div></div>
        <div>${S.problems.filter(p=>solved.has(p.id)).map(p=>`
          <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--line)">
            <span style="color:var(--grn);font-weight:700;font-size:11px">AC</span>
            <div style="flex:1;min-width:0"><div style="font-size:12px;color:var(--t0)">${esc(p.title)}</div></div>
            <span class="${diffCls(p.difficulty)}">${p.difficulty}</span>
            <span style="color:var(--gold);font-weight:700;font-size:13px">+${p.points}</span>
          </div>`).join('')||'<div class="empty"><div class="empty-ico" style="font-size:14px;color:var(--t3)">—</div></div>'}
        </div>
      </div>
      <div class="card">
        <div class="card-hdr"><div class="card-title">Recent Submissions</div></div>
        <div>${scopedSubs.slice(0,8).map(s=>{
          const p=S.problems.find(x=>x.id===s.problemId);
          const vc=s.verdict==='AC'?'var(--grn)':s.verdict==='WA'?'var(--rose)':s.verdict==='TLE'?'var(--gold)':'var(--violet)';
          return `<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--line)">
            <span style="color:${vc};font-weight:700;font-size:11px;width:36px">${s.verdict}</span>
            <div style="flex:1;min-width:0"><div style="font-size:12px;color:var(--t0)" class="trunc">${esc(p?.title||'—')}</div></div>
            <span style="font-size:10px;color:var(--t3)">${new Date(s.at).toLocaleDateString()}</span>
          </div>`;}).join('')||'<div class="empty"><div class="empty-ico" style="font-size:14px;color:var(--t3)">—</div></div>'}
        </div>
      </div>
    </div>`;
}

/* ══════════════════════════════════════════════════════════
   THEME
══════════════════════════════════════════════════════════ */
function applyTheme(mode){
  const saved=mode||LS.get('theme')||'dark';
  const next=saved==='light'?'light':'dark';
  document.body.classList.toggle('light',next==='light');
  const btn=el('theme-btn');
  if(btn){
    btn.style.display='inline-flex';
    btn.textContent=next==='light'?'☀':'◑';
    btn.title=next==='light'?'Switch to dark mode':'Switch to light mode';
  }
  LS.set('theme',next);
}
function toggleTheme(){
  const current=document.body.classList.contains('light')?'light':'dark';
  applyTheme(current==='light'?'dark':'light');
}

function withTimeout(promise,ms,label='operation'){
  return Promise.race([
    promise,
    new Promise((_,reject)=>setTimeout(()=>reject(new Error(`${label} timed out after ${ms}ms`)),ms))
  ]);
}

async function safeCloudCall(fn,label,timeout=12000){
  try{
    return await withTimeout(fn(),timeout,label);
  }catch(err){
    console.warn(`[Init] ${label} failed:`,err?.message||err);
    return null;
  }
}

/* ══════════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════════ */
async function init(){
  applyTheme();
  // Load problems from relational table first when available.
  const relResult=await safeCloudCall(()=>loadProblemsFromRelational(),'loadProblemsFromRelational')||{success:false,problems:null};
  if(relResult.success&&Array.isArray(relResult.problems)&&relResult.problems.length>0){
    S.problems=relResult.problems;
  } else {
    // Fallback: merge local cached problems with defaults.
    const savedP=LS.get('problems');
    if(savedP&&savedP.length>0){
      const defaultIds=new Set(PROBLEMS_DEFAULT.map(p=>p.id));
      const customProblems=savedP.filter(p=>!defaultIds.has(p.id));
      S.problems=[
        ...PROBLEMS_DEFAULT,
        ...customProblems.map(p=>({...p,testCases:(p.testCases||[]).map(tc=>({...tc,validate:buildValidator(tc,p)}))}))
      ];
    } else {
      S.problems=[...PROBLEMS_DEFAULT];
      persistProblems();
    }
    if(Array.isArray(relResult.problems)&&relResult.problems.length===0){
      await safeCloudCall(()=>seedProblemsToRelational(S.problems),'seedProblemsToRelational');
    }
  }
  S.problems=normalizeKnownSampleOutputs(S.problems);
  const repairInit=repairProblemBank(S.problems);
  S.problems=repairInit.problems;
  persistProblems();
  if(repairInit.repaired.length){
    repairInit.repaired.forEach(problem=>{
      syncProblemToRelational(problem).catch(err=>console.warn('Background repaired problem sync failed:',err));
    });
  }
  S.problems=injectHiddenStrongTestCases(S.problems);

  // Load contests from relational table first when available.
  const relContestResult=await safeCloudCall(()=>loadContestsFromRelational(),'loadContestsFromRelational')||{success:false,contests:null};
  if(relContestResult.success&&Array.isArray(relContestResult.contests)&&relContestResult.contests.length>0){
    const allContests=relContestResult.contests;
    S.contests=allContests.filter(c=>c.type!=='custom');
    S.customContests=allContests.filter(c=>c.type==='custom');
    LS.set('contests',S.contests.map(({announce,...r})=>r));
    LS.set('customContests',S.customContests);
  } else {
    const savedC=LS.get('contests');
    if(savedC&&savedC.length>0)S.contests=savedC;
    else{S.contests=[...CONTESTS_DEFAULT];LS.set('contests',S.contests);}
  }

  // Seed admin account (admin123 / 123) — always ensure it exists
  if(!LS.get('user:admin123')){
    const seededAdmin={userId:'admin-uid-001',username:'admin123',email:'admin123@besql.local',passwordHash:await hashPassword('123'),role:'admin',score:0,solved:0,joinedAt:Date.now()};
    LS.set('user:admin123',seededAdmin);
    await safeCloudCall(()=>syncUserToRelational(seededAdmin),'syncUserToRelational(admin)');
  } else {
    // Ensure role stays admin even if tampered, and migrate plain password.
    const adm=LS.get('user:admin123');
    if(adm&&adm.password&&!adm.passwordHash){adm.passwordHash=await hashPassword(adm.password);delete adm.password;}
    if(adm&&adm.role!=='admin'){adm.role='admin';LS.set('user:admin123',adm);}
    else if(adm){LS.set('user:admin123',adm);}
    if(adm)await safeCloudCall(()=>syncUserToRelational(adm),'syncUserToRelational(existing admin)');
  }

  // Load user session
  const sessionUser=restoreSessionUser();
  if(sessionUser){
    S.user=sessionUser;
    S.submissions=normalizeSubmissionList(LS.get(`subs:${sessionUser.userId}`)||[]);
    LS.set(`subs:${sessionUser.userId}`,S.submissions);
    recomputeCurrentUserStatsFromSubmissions();
    hydrateSubmissionsFromRelational(sessionUser).catch(err=>console.warn('Session relational submissions hydrate failed:',err));
  }

  // Load custom contests from local fallback only when relational is unavailable/empty.
  if(!(relContestResult.success&&Array.isArray(relContestResult.contests)&&relContestResult.contests.length>0)){
    const globalCustom=LS.get('customContests')||[];
    const ownCustom=S.user?LS.get(`custom:${S.user.userId}`)||[]:[];
    const mergedCustom=[...globalCustom,...ownCustom];
    const seenCustom=new Set();
    S.customContests=mergedCustom.filter(c=>{
      if(!c||!c.id||seenCustom.has(c.id))return false;
      seenCustom.add(c.id);
      return true;
    });
  }

  const removedContestIds=purgeRemovedContestsFromState();
  if(removedContestIds.length){
    removedContestIds.forEach(id=>{
      deleteContestFromRelational(id).catch(err=>console.warn('Background removed contest cleanup failed:',err));
    });
  }

  S.customContests.forEach(normalizeContestLifecycle);
  S.contests.forEach(normalizeContestLifecycle);
  LS.set('contests',S.contests.map(({announce,...r})=>r));
  LS.set('customContests',S.customContests);

  if(relContestResult.success&&Array.isArray(relContestResult.contests)&&relContestResult.contests.length===0){
    await safeCloudCall(()=>seedContestsToRelational([...S.contests,...S.customContests]),'seedContestsToRelational');
  }

  // Announcement
  const ann=LS.get('announcement');
  if(ann){el('announce-text').textContent=ann;show('announce-bar');}

  // Practice lab sandbox
  S.practiceLab=LS.get('practiceLab')||createDefaultPracticeLab();
  S.practiceLabTaskDone=LS.get('practiceLabTaskDone')||{};
  hydrateJudgeSessionsForCurrentUser();
  attachSqlHighlighting('practice-lab-editor');
  const practiceEditor=el('practice-lab-editor');
  if(practiceEditor&&practiceEditor.dataset.shortcutsBound!=='1'){
    practiceEditor.dataset.shortcutsBound='1';
    practiceEditor.addEventListener('keydown',e=>{
      if((e.ctrlKey||e.metaKey)&&e.key==='/'){
        e.preventDefault();
        commentPracticeLabEditor();
      }
    });
  }

  // Render
  renderTopRight();
  renderSidebar();
  const entryView=getEntryViewOverride();
  if(entryView){
    const entryContestId=getEntryContestId();
    if(entryView==='scoreboards'&&entryContestId)nav(entryView,{contestId:entryContestId});
    else nav(entryView);
  }
  else{
    const restoredRoute=restoreRouteState();
    if(!restoredRoute)renderHome();
  }
  el('btn-create-contest') && tog('btn-create-contest',isMaster());

  if(STORAGE_MODE!=='supabase'){
    toast(STORAGE_DIAGNOSTIC||'Supabase unavailable. Running in local browser storage mode.','warn');
  }

  hide('init');
}

let bgRefreshInFlight=false;
let lastBgRefreshAt=0;

function rerenderCurrentViewPreserveState(){
  const view=S.currentView||'home';
  if(view==='judge'){
    saveJudgeSessionState(S.judgeContext);
    return;
  }
  if(view==='contest-detail'){
    if(S.currentContest)renderContestDetail(S.currentContest);
    else renderContests();
    return;
  }
  if(view==='home')renderHome();
  else if(view==='contests')renderContests();
  else if(view==='practice')renderPractice();
  else if(view==='playground')renderPlayground();
  else if(view==='submissions')renderSubmissions();
  else if(view==='scoreboards')renderContestScoreboards();
  else if(view==='profile')renderProfile();
  else if(view==='custom')renderCustom();
  else if(view==='admin')renderAdmin();
}

async function refreshDataInBackground(reason='tab-return'){
  if(bgRefreshInFlight)return;
  if(!SB||STORAGE_MODE!=='supabase')return;
  const now=Date.now();
  if(now-lastBgRefreshAt<8000)return;
  lastBgRefreshAt=now;
  bgRefreshInFlight=true;
  try{
    const [relProblems,relContests]=await Promise.all([
      safeCloudCall(()=>loadProblemsFromRelational(),'bg-load-problems',8000),
      safeCloudCall(()=>loadContestsFromRelational(),'bg-load-contests',8000),
    ]);

    let changed=false;
    if(relProblems?.success&&Array.isArray(relProblems.problems)&&relProblems.problems.length>0){
      S.problems=normalizeKnownSampleOutputs(relProblems.problems);
      const repairBg=repairProblemBank(S.problems);
      S.problems=repairBg.problems;
      S.problems=injectHiddenStrongTestCases(S.problems);
      persistProblems();
      if(repairBg.repaired.length){
        repairBg.repaired.forEach(problem=>{
          syncProblemToRelational(problem).catch(err=>console.warn('Background repaired problem sync failed:',err));
        });
      }
      changed=true;
    }

    if(relContests?.success&&Array.isArray(relContests.contests)){
      const all=relContests.contests;
      S.contests=all.filter(c=>c.type!=='custom');
      S.customContests=all.filter(c=>c.type==='custom');
      const removedContestIds=purgeRemovedContestsFromState();
      if(removedContestIds.length){
        removedContestIds.forEach(id=>{
          deleteContestFromRelational(id).catch(err=>console.warn('Background removed contest cleanup failed:',err));
        });
      }
      S.contests.forEach(normalizeContestLifecycle);
      S.customContests.forEach(normalizeContestLifecycle);
      LS.set('contests',S.contests.map(({announce,...r})=>r));
      LS.set('customContests',S.customContests);
      changed=true;
    }

    if(changed){
      renderTopRight();
      renderSidebar();
      rerenderCurrentViewPreserveState();
    }
  }catch(err){
    console.warn('[Background Refresh] failed:',reason,err?.message||err);
  }finally{
    bgRefreshInFlight=false;
  }
}

// Modal close on backdrop
document.querySelectorAll('.overlay').forEach(o=>{
  o.addEventListener('click',e=>{if(e.target===o)closeModal(o.id);});
});
// ESC to close
document.addEventListener('keydown',e=>{
  if(e.key==='Escape')document.querySelectorAll('.overlay:not(.hidden)').forEach(o=>closeModal(o.id));
});

// Login shortcuts
document.addEventListener('keydown',e=>{
  if(e.key==='Enter'){
    if(!el('modal-auth').classList.contains('hidden')){
      if(el('ap'))doLogin();else if(el('rp'))doRegister();
    }
  }
});

document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible'){
    refreshDataInBackground('visibilitychange');
  }
});
window.addEventListener('focus',()=>refreshDataInBackground('focus'));

async function bootstrap(){
  try{
    const storageResult=await initStorageWithTimeout();
    if(!storageResult.success){
      console.warn('[Bootstrap] Storage initialization failed, using fallback mode');
      if(storageResult.timedOut){
        toast('Database connection timeout. Running in offline mode.','warn');
      }
    }
    await withTimeout(init(),6000,'init');
  }catch(err){
    console.error('[Bootstrap] Initialization failed:',err?.message||err);
    toast('Startup took too long. Loaded in safe mode.','warn');
    try{
      renderTopRight();
      renderSidebar();
      const restoredRoute=restoreRouteState();
      if(!restoredRoute)renderHome();
    }catch{}
  }finally{
    hide('init');
  }
}
bootstrap();
