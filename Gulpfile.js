var gulp = require('gulp');
var $ = require('gulp-load-plugins')({lazy: false});
var transform = require('vinyl-transform');
var browserify = require('browserify');

var through = require('through');
var mystc = require('myst/compiler');

function compileMystFiles(file) {
  if (!/\.myst$/.test(file)) {
    return through();
  }

  var data = '';
  function write(buf) { data += buf; }
  function end() {
    var src;
    try {
      src = mystc.compile(data, { });
    } catch (e) {
      this.emit('error', e);
    }
    this.queue(src);
    this.queue(null);
  }

  return through(write, end);
}

gulp.task('scripts', function() {
  var browserified = transform(function(filename) {
    var b = browserify(filename, {
      extensions: ['.myst'],
      debug: true
    });
    b.transform(compileMystFiles);
    return b.bundle();
  });

  return gulp.src(['./src/index.myst'])
             .pipe(browserified)
             .pipe($.rename('myst.js'))
             .pipe(gulp.dest('./dist'));
});

gulp.task('minify', ['scripts'], function() {
  return gulp.src(['./dist/myst.js'])
             .pipe($.uglify())
             .pipe($.rename('myst.min.js'))
             .pipe(gulp.dest('./dist'));
});

