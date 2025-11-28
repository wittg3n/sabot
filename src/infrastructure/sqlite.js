'use strict';

const { execFileSync } = require('child_process');

function escapeValue(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : 'NULL';
  }

  const stringValue = String(value).replace(/'/g, "''");
  return `'${stringValue}'`;
}

function applyParams(sql, params = []) {
  let index = 0;
  return sql.replace(/\?/g, () => {
    if (index >= params.length) {
      return 'NULL';
    }
    const formatted = escapeValue(params[index]);
    index += 1;
    return formatted;
  });
}

class Statement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
  }

  run(...params) {
    this.db.exec(applyParams(this.sql, params));
    return { changes: 0 };
  }

  get(...params) {
    const rows = this.db.query(applyParams(this.sql, params));
    return rows[0];
  }

  all(...params) {
    return this.db.query(applyParams(this.sql, params));
  }
}

class Database {
  constructor(path) {
    this.path = path;
  }

  exec(sql) {
    execFileSync('sqlite3', [this.path, sql], { stdio: 'pipe' });
  }

  query(sql) {
    const output = execFileSync('sqlite3', ['-json', this.path, sql], {
      encoding: 'utf8',
      stdio: 'pipe',
    });

    if (!output.trim()) {
      return [];
    }

    return JSON.parse(output);
  }

  prepare(sql) {
    return new Statement(this, sql);
  }
}

module.exports = Database;
