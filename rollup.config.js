import sourcemaps from "rollup-plugin-sourcemaps";
import babel from "@rollup/plugin-babel";
import typescript from "rollup-plugin-typescript2";
import { terser } from "rollup-plugin-terser";
import json from "@rollup/plugin-json";

export default {
  input: "src/index.ts",
  output: {
    exports: "auto",
    file: "lib/annotation.min.js",
    format: "umd",
    name: "Annotation",
    sourcemap: true,
  },
  plugins: [
    sourcemaps(),
    typescript(),
    babel({ babelHelpers: "bundled" }),
    terser(),
    json(),
  ],
};
