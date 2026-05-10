'use strict';

function besqlTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

window.PROBLEMS_DEFAULT = [];
