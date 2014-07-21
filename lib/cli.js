// Generated by CoffeeScript 1.7.1

/*
This program is distributed under the terms of the GPLv3 license.
Copyright 2012 (c) Markus Kohlhase <mail@markus-kohlhase.de>
 */

(function() {
  var BAD_DIR, BAD_FILE, BAD_FORMAT, async, csvify, fs, parseDir, parseFile, path, pkg, print, programm, sloc, stats;

  fs = require('fs');

  path = require('path');

  async = require('async');

  sloc = require('./sloc');

  programm = require('commander');

  pkg = require('../package.json');

  BAD_FILE = "badFile";

  BAD_FORMAT = "badFormat";

  BAD_DIR = "badDirectory";

  parseFile = function(f, cb) {
    if (cb == null) {
      cb = function() {};
    }
    return fs.readFile(f, "utf8", function(err, code) {
      var e;
      if (err) {
        return cb(BAD_FILE);
      }
      try {
        return cb(null, sloc(code, path.extname(f).slice(1)));
      } catch (_error) {
        e = _error;
        return cb(BAD_FORMAT);
      }
    });
  };

  parseDir = function(dir, cb) {
    var exclude, files, inspect, res;
    files = [];
    res = [];
    exclude = null;
    if (programm.exclude) {
      exclude = new RegExp(programm.exclude);
    }
    inspect = function(dir, done) {
      if (exclude != null ? exclude.test(dir) : void 0) {
        return done();
      }
      return fs.readdir(dir, function(err, items) {
        if (err != null) {
          res.push({
            err: BAD_DIR,
            path: dir
          });
          return done();
        }
        return async.forEach(items, function(item, next) {
          var p;
          p = "" + dir + "/" + item;
          if (exclude != null ? exclude.test(p) : void 0) {
            return next();
          }
          return fs.lstat(p, function(err, stat) {
            if (err != null) {
              res.push({
                err: BAD_FILE,
                path: p
              });
              return next();
            }
            if (stat.isDirectory()) {
              return inspect(p, next);
            }
            files.push(p);
            return next();
          });
        }, done);
      });
    };
    return inspect(dir, function() {
      var processResults;
      processResults = function(err) {
        var init, sums;
        if (err) {
          return cb(err);
        }
        init = {
          loc: 0,
          sloc: 0,
          cloc: 0,
          scloc: 0,
          mcloc: 0,
          nloc: 0
        };
        init[BAD_FILE] = 0;
        init[BAD_FORMAT] = 0;
        init[BAD_DIR] = 0;
        res.splice(0, 0, init);
        sums = res.reduce(function(a, b) {
          var k, o, v;
          o = {};
          for (k in a) {
            v = a[k];
            o[k] = a[k] + (b[k] || 0);
          }
          if (b.err != null) {
            o[b.err]++;
          }
          return o;
        });
        sums.filesRead = res.length - 1;
        if (programm.verbose) {
          res.splice(0, 1);
          sums.details = res;
        }
        return cb(null, sums);
      };
      return async.forEach(files, function(f, next) {
        return parseFile(f, function(err, r) {
          if (err) {
            r = {
              err: err,
              path: f
            };
          } else {
            r.path = f;
          }
          res.push(r);
          return next();
        });
      }, processResults);
    });
  };

  csvify = function(data) {
    var headers, k, lineize, lines, sf, v, _i, _len, _ref;
    headers = {
      loc: "Physical lines",
      sloc: "Lines of source code",
      cloc: "Total comment",
      scloc: "Singleline",
      mcloc: "Multiline",
      nloc: "Empty"
    };
    lines = "Path," + (((function() {
      var _results;
      _results = [];
      for (k in headers) {
        v = headers[k];
        _results.push(v);
      }
      return _results;
    })()).join(',')) + "\n";
    lineize = function(t) {
      return "" + (t.path || "Total") + "," + (((function() {
        var _results;
        _results = [];
        for (k in headers) {
          v = headers[k];
          _results.push(t[k]);
        }
        return _results;
      })()).join(',')) + "\n";
    };
    if (data.details) {
      _ref = data.details;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        sf = _ref[_i];
        lines += lineize(sf);
      }
    } else {
      lines += lineize(data);
    }
    return lines;
  };

  print = function(err, r, file) {
    var details, _i, _len, _ref;
    if (file == null) {
      file = null;
    }
    if (programm.json) {
      return console.log(JSON.stringify(err != null ? {
        err: err
      } : r));
    }
    if (programm.csv) {
      return console.log(err != null ? {
        err: err
      } : csvify(r));
    }
    if (file == null) {
      console.log("\n---------- result ------------\n");
    } else {
      console.log("\n--- " + file);
    }
    if (err != null) {
      console.log("               error :  " + err);
    } else if (programm.sloc) {
      console.log(r.sloc);
    } else {
      console.log("      physical lines :  " + r.loc + "\nlines of source code :  " + r.sloc + "\n       total comment :  " + r.cloc + "\n          singleline :  " + r.scloc + "\n           multiline :  " + r.mcloc + "\n               empty :  " + r.nloc);
    }
    if (file == null) {
      if (r.filesRead != null) {
        console.log("\n\nnumber of files read :  " + r.filesRead);
      }
      if (r[BAD_FORMAT]) {
        console.log("unknown source files :  " + r[BAD_FORMAT]);
      }
      if (r[BAD_FILE]) {
        console.log("        broken files :  " + r[BAD_FILE]);
      }
      if (r[BAD_DIR]) {
        console.log("  broken directories :  " + r[BAD_DIR]);
      }
      if (r.details != null) {
        console.log('\n---------- details -----------');
        _ref = r.details;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          details = _ref[_i];
          print(details.err, details, details.path);
        }
      }
      return console.log("\n------------------------------\n");
    }
  };

  programm.version(pkg.version).usage('[option] <file>|<directory>').option('-j, --json', 'return JSON object').option('-c, --csv', 'return CSV').option('-s, --sloc', 'print only number of source lines').option('-v, --verbose', 'print or add analized files').option('-e, --exclude <regex>', 'regular expression to exclude files and folders');

  programm.parse(process.argv);

  if (programm.args.length < 1) {
    programm.help();
  } else {
    stats = fs.lstatSync(programm.args[0]);
    if (stats.isDirectory()) {
      parseDir(programm.args[0], print);
    } else if (stats.isFile()) {
      parseFile(programm.args[0], print);
    }
  }

}).call(this);