const path = require("path");
const { watch, src, dest, series, parallel } = require("gulp");
const browserSync = require("browser-sync").create();
const del = require("del");
const imagemin = require("gulp-imagemin");
const advpng = require("imagemin-advpng");
const cache = require("gulp-cache");
const gulpif = require("gulp-if");
const rename = require("gulp-rename");
const sourcemaps = require("gulp-sourcemaps");
const plumber = require("gulp-plumber");

const pug = require("gulp-pug");
const replace = require("gulp-replace");
const smartgrid = require("smart-grid");
const sass = require("gulp-sass");
const mq = require("gulp-group-css-media-queries");
const postcss = require("gulp-postcss");
const autoprefixer = require("autoprefixer");
const cssnano = require("cssnano");

const uglify = require("gulp-uglify-es").default;
const source = require("vinyl-source-stream");
const buffer = require("vinyl-buffer");
const browserify = require("browserify");

const isDev = process.argv.includes("dev");
const isWatch = process.argv.includes("watch");
const isDevOrWatch = isDev || isWatch;
console.log(isDev);

const configES5 = path.join(__dirname, "babel.config-es5.js");
const configES6 = path.join(__dirname, "babel.config.js");

function bundle(configFile = configES6) {
  const isES5 = configFile === configES5;
  return browserify({
    entries: ["./src/js7/all.js"],
    debug: true
  })
    .transform("babelify", { configFile })
    .bundle()
    .pipe(source("all.js"))
    .pipe(buffer())
    .pipe(plumber())
    .pipe(gulpif(isES5, rename({ suffix: "-es5" })))
    .pipe(gulpif(!isES5, rename({ extname: ".mjs" })))
    .pipe(gulpif(isDevOrWatch, dest("src/js")))
    .pipe(gulpif(isDev, browserSync.stream()));
}

function minJs(configFile) {
  return bundle(configFile)
    .pipe(uglify({ ecma: 6 }))
    .pipe(rename({ suffix: ".min" }))
    .pipe(dest("dist/js"));
}

const bundleES5 = () => bundle(configES5);
const minES5 = () => minJs(configES5);

const bundleES6 = () => bundle();
const minES6 = () => minJs();

function compSass() {
  return src("src/scss/all.scss")
    .pipe(plumber())
    .pipe(gulpif(isDevOrWatch, sourcemaps.init()))
    .pipe(sass().on("error", sass.logError))
    .pipe(gulpif(isDevOrWatch, sourcemaps.write()))
    .pipe(gulpif(isDevOrWatch, dest("src/css")))
    .pipe(gulpif(isDev, browserSync.stream()));
}

function minCss() {
  return compSass()
    .pipe(mq())
    .pipe(postcss([autoprefixer(), cssnano()]))
    .pipe(rename({ suffix: ".min" }))
    .pipe(dest("dist/css"));
}

async function grid() {
  let settings = {
    outputStyle: "scss",
    columns: 12,
    offset: "30px",
    //mobileFirst: true,
    container: {
      maxWidth: "1200px",
      fields: "30px"
    },
    breakPoints: {
      lg: {
        width: "1100px"
      },
      md: {
        width: "960px",
        fields: "15px"
      },
      sm: {
        width: "780px"
      },
      xs: {
        width: "560px"
      },
      xxs: {
        width: "420px"
      }
    }
  };

  smartgrid("./src/scss", settings);
}

const compPug = () =>
  src("src/pug/index.pug")
    .pipe(plumber())
    .pipe(pug({ pretty: true }))
    .pipe(gulpif(isDevOrWatch, dest("src")));

const distView = () =>
  compPug()
    .pipe(replace("all.css", "all.min.css"))
    .pipe(replace("all-es5.js", "all-es5.min.js"))
    .pipe(replace("all.js", "all.min.js"))
    .pipe(dest("dist"));

async function watchWrap() {
  if (isDev) {
    browserSync.init({ server: "src" });
    watch("src/pug/**", compPug);
    watch("src/scss/**", compSass);
    watch("src/js7/**", parallel(bundleES5, bundleES6));
    watch("src/*.html").on("change", browserSync.reload);
  } else if (isDevOrWatch) {
    watch("src/pug/**", distView);
    watch("src/scss/**", minCss);
    watch("src/js7/**", parallel(minES5, minES6));
  }
}

function font() {
  return src("src/fonts/**").pipe(dest("dist/fonts"));
}

function image() {
  return src("src/images/*.+(jpg|jpeg|png|gif|svg)")
    .pipe(
      cache(
        imagemin(
          [
            imagemin.gifsicle({ interlaced: true }),
            imagemin.jpegtran({ progressive: true }),
            advpng(),
            imagemin.svgo({
              plugins: [{ removeViewBox: true }, { cleanupIDs: false }]
            })
          ],
          { verbose: true }
        )
      )
    )
    .pipe(dest("dist/images"));
}

const pathsToDel = [
  "dist/**",
  "!dist",
  "src/js/**",
  "!src/js",
  "src/css/**",
  "!src/css"
];

async function cleanHard() {
  await del(pathsToDel);
  return cache.clearAll();
}

const clean = async () =>
  del(pathsToDel.concat(["!dist/images", "!dist/images/*"]));

exports.build = series(
  clean,
  parallel(font, image, distView, minCss, minES5, minES6)
);

exports.dev = series(
  clean,
  parallel(compPug, bundleES5, bundleES6, compSass),
  watchWrap
);

exports.watch = series(
  clean,
  parallel(distView, minES5, minES6, minCss),
  watchWrap
);

exports.grid = grid;
exports.clean = cleanHard;
exports.html = distView;
exports.css = minCss;
exports.js = parallel(minES5, minES6);
exports.img = image;
