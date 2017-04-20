var gulp = require('gulp'),
  path = require('path'),
  pngquant = require('imagemin-pngquant'),
  del = require('del'),
  runSequence = require('run-sequence'),
  wiredep = require('wiredep').stream,
  browserSync = require('browser-sync').create(),
  reload = browserSync.reload;

var $ = require('gulp-load-plugins')();

gulp.task('sass', function() {
  return gulp.src('app/sass/**/*.scss')
    .pipe($.sass({ outputStyle: 'compressed' }).on('error', $.sass.logError))
    .pipe($.autoprefixer())
    .pipe(gulp.dest('.tmp/css'))
    .pipe(reload({ stream: true }));
});

gulp.task('html', ['sass'], function() {
  var jsFilter = $.filter("**/*.js", { restore: true });
  var cssFilter = $.filter("**/*.css", { restore: true });
  var removeMapsFilter = $.filter('**/*.{html,js,css}', {restore: true});

  return gulp.src('app/*.html')
    .pipe($.useref({searchPath: ['.tmp', 'app', '.']}))
    .pipe(jsFilter)
    .pipe($.sourcemaps.init())
    .pipe($.uglify())
    .pipe($.rev())
    .pipe($.sourcemaps.write('map'))
    .pipe(jsFilter.restore)
    .pipe(cssFilter)
    .pipe($.cssnano())
    .pipe($.rev())
    .pipe(cssFilter.restore)
    .pipe(removeMapsFilter)
    .pipe($.revReplace())
    .pipe(removeMapsFilter.restore)
    .pipe(gulp.dest('dist'))
});

gulp.task('htmlmin', ['html'], function() {
  return gulp.src('dist/**/*.html')
    .pipe($.htmlmin({
      removeEmptyAttributes: true,
      removeAttributeQuotes: true,
      collapseBooleanAttributes: true,
      collapseWhitespace: true,
      customAttrSurround: [
        [/@/, /(?:)/]
      ]
    }).on('error', console.error))
    .pipe(gulp.dest('dist'));
})

gulp.task('imagemin', function() {
  return gulp.src('app/images/**/*.+(png|jpg|jpeg|gif|svg)')
    .pipe($.cache($.imagemin({
      progressive: true,
      svgoPlugins: [{ removeViewBox: false }],
      use: [pngquant()]
    })))
    .pipe(gulp.dest('dist/images'))
});

gulp.task('jsonmin', function() {
  return gulp.src('app/**/*.json')
    .pipe($.jsonminify())
    .pipe(gulp.dest('dist'));
});

gulp.task('base64', ['html'], function() {
  return gulp.src('dist/css/*.min.css')
    .pipe($.base64({
      extensions: ['png', /\.jpg#datauri$/i],
      exclude: [/\.server\.(com|net)\/dynamic\//, '--live.jpg'],
      maxImageSize: 3 * 1024, // bytes 
      debug: true
    }))
    .pipe(gulp.dest('dist/css'));
});

gulp.task('other', function() {
  var fileFilter = $.filter(function (file) {
    return file.stat.isFile();
  });

  return gulp.src([
      path.join('app', '/**/*'),
      path.join('!' + 'app/images' + '/**/*'),
      path.join('!' + 'app' + '/**/*.{html,css,js,scss,json}')
    ])
    .pipe(fileFilter)
    .pipe(gulp.dest('dist'))
});

gulp.task('clean', del.bind(null, ['.tmp', 'dist']));

// inject bower components
gulp.task('wiredep', () => {
  // TODO(Hom): scss wiredep
  // gulp.src('app/sass/*.scss')
  //   .pipe(filter(file => file.stat && file.stat.size))
  //   .pipe(wiredep({
  //     ignorePath: /^(\.\.\/)+/
  //   }))
  //   .pipe(gulp.dest('.tmp/css'));

  gulp.src('app/*.html')
    .pipe(wiredep({
      ignorePath: /^(\.\.\/)*\.\./
    }))
    .pipe(gulp.dest('app'))
    .pipe(reload({ stream: true }));
});

gulp.task('build', function(callback) {
  runSequence('clean', 'wiredep', ['html', 'base64', 'htmlmin', 'imagemin', 'jsonmin', 'other'], callback);
});

gulp.task('serve:dist', ['build'], function() {
  browserSync.init({
    notify: false,
    port: 9000,
    server: {
      baseDir: ['dist']
    }
  });
});

gulp.task('serve', function() {
  runSequence('wiredep', 'sass', function() {
    browserSync.init({
      notify: false,
      port: 9000,
      server: {
        baseDir: ['.tmp', 'app'],
        routes: {
          '/bower_components': 'bower_components'
        }
      }
    });

    gulp.watch([
      '.tmp/*.html',
      'app/images/**/*',
      'app/js/**/*',
      '.tmp/fonts/**/*'
    ]).on('change', reload);

    gulp.watch('app/*.html', ['wiredep']);
    gulp.watch('app/sass/**/*.scss', ['sass']);
  });
});

gulp.task('default', function() {
  gulp.start('build');
});
gulp.task('prod', function() {
  gulp.start('build', function() {
    del('dist/map');
  });
});