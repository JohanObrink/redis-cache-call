const gulp = require('gulp')
const mocha = require('gulp-mocha')
const eslint = require('gulp-eslint')

const running = {}
const watching = {}

gulp.task('lint', () => {
  running.lint = ['gulpfile.js', 'lib/**/*.js', 'test/**/*.js']
  return gulp.src(running.lint)
    .pipe(eslint())
    .pipe(eslint.format())
})

gulp.task('unit', () => {
  process.env.REDIS_HOST = 'localhost'
  running.unit = ['test/unit/**/*.js', 'lib/**/*.js']
  return gulp.src(running.unit[0])
    .pipe(mocha({reporter: 'spec'}))
})

gulp.task('integration', () => {
  process.env.REDIS_HOST = 'localhost'
  running.integration = ['test/integration/**/*.js', 'lib/**/*.js']
  return gulp.src(running.integration[0])
    .pipe(mocha({reporter: 'spec'}))
})

gulp.task('watch', () => {
  Object.keys(running)
    .filter(key => !watching[key])
    .forEach(key => {
      watching[key] = true
      gulp.watch(running[key], [key])
    })
})
