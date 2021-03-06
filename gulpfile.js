var gulp=require("gulp");
var runSequence = require('run-sequence');
var browser = require("browser-sync").create();
var webpack = require("webpack-stream");
var plumber = require("gulp-plumber");
var eslint = require('gulp-eslint');
var uglifyes = require('uglify-es');
var composer = require('gulp-uglify/composer');
var pump = require('pump');
var translator= require("./util/translator.js")
var imagemin = require('gulp-imagemin');
var minify = composer(uglifyes, console);
var request = require('sync-request');
var fs  = require("fs")
gulp.task("browserSync", function() {
  browser.init({
    server:{
      baseDir:"./"
    },
    open:false
  });
});

gulp.task("reload",function(){
  browser.reload()
})

gulp.task("lint",function(){
  gulp.src(["component/*.js","js/*.js"])
    .pipe(plumber({
      errorHandler: function(error) {
        var taskName = 'eslint';
        var title = '[task]' + taskName + ' ' + error.plugin;
        var errorMsg = 'error: ' + error.message;
        console.error(title + '\n' + errorMsg);
      }
    }))
    .pipe(eslint({ useEslintrc: true })) // .eslintrc を参照
    .pipe(eslint.format())
    .pipe(eslint.failOnError())
    .pipe(plumber.stop());
})
gulp.task('webpack', function(){
  return gulp.src('js/main.js')
    .pipe(webpack(require("./webpack.config.dev")))
    .pipe(gulp.dest('./'))
});
gulp.task('webpackProd', function(){
  return gulp.src('js/main.js')
    .pipe(webpack(require("./webpack.config")))
    .pipe(gulp.dest('./'))
});
gulp.task('webpackCordova', function(){
  return gulp.src('js/main.js')
    .pipe(webpack(require("./webpack.config.cordova")))
    .pipe(gulp.dest('./cordovaProj/www'))
});
gulp.task("watch", function() {
  gulp.watch("dist/dist.js", ["reload"]);
  gulp.watch("component/*.html", ["copyJa"]);
});



gulp.task("setDocs", function() {
  return gulp.src(["dist/**"])
    .pipe(gulp.dest("./docs/wallet/dist"))
});
gulp.task("setChrome", function() {
  return gulp.src(["dist/**"])
    .pipe(gulp.dest("./chrome_extension/dist"))
});
gulp.task("setElectron", function() {
  return gulp.src(["dist/**"])
    .pipe(gulp.dest("./electron/src/dist"))
});
gulp.task("compressImage", function() {
  return gulp.src(["dist/assets/*.png"])
    .pipe(imagemin())
    .pipe(gulp.dest("./cordovaProj/www/distForShitPhone/assets"))
});

gulp.task("default", function(cb) {
  return runSequence(
    "copyJa",
    "translateEn",
    ['browserSync',"webpack","watch"],   
    cb
  );
});
gulp.task("prod", function(cb) {
  return runSequence(
    "copyJa",
    
    "translateEn",
    ["lint","webpackCordova"],
    "compressImage",
    cb
  );
});

var height
try{
  height = JSON.parse(request('GET', 'https://mona.insight.monaco-ex.org/insight-api-monacoin/sync').getBody('utf8')).height
}catch(e){
  height=-1
}
console.log("Monacoin Block Height is ",height)
gulp.task("copyJa", function(cb) {
  return gulp.src("component/*.html").pipe(translator.translate({
    dictFile:"../lang/template.json",
    dict:{
      "<!--t:Timestamp-->":height
    }
  })).pipe(gulp.dest("./component/ja"))
});
gulp.task("addWord", function(cb) {
  return gulp.src("component/ja/*").pipe(translator.addWord({
    dictFile:"../lang/dict.json"
  }))
});
gulp.task("translateEn", function(cb) {
  return gulp.src("component/ja/*.html").pipe(translator.translate({
    dictFile:"../lang/dict.json"
  })).pipe(gulp.dest("./component/en"))
});
gulp.task("serviceWorker", function(cb) {
  var files = fs.readdirSync("./dist/assets").filter(n=>n[0]!==".")
  return gulp.src("js/sw.js").pipe(translator.translate({
    dictFile:"../lang/template.json",
    dict:{
      "<!--t:Timestamp-->":height,
      "<!--t:Caches-->":files.join(",")
    }
  })).pipe(minify({}))
    .pipe(gulp.dest("./dist"))
});
