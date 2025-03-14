import fs from 'fs'
import path from 'path'
import TerserPlugin from 'terser-webpack-plugin'
import * as url from 'url'
import webpack from 'webpack'

export default (env) => {
  const minified = !!env.minified
  const packageJsonStr = fs.readFileSync('package.json')
  const packageJson = JSON.parse(packageJsonStr)
  const newVersion = packageJson.version
  const currentYear = new Date().getFullYear()
  const __dirname = url.fileURLToPath(new url.URL('.', import.meta.url))
  const outputPath = path.join(__dirname, './')

  return {
    entry: {
      [`dist/jspdf.plugin.autotable${minified ? '.min' : ''}`]: './src/main.ts',
    },
    resolve: { extensions: ['.ts', '.js'] },
    output: {
      path: outputPath,
      filename: '[name].js',
      libraryTarget: 'umd',
      globalObject:
        "typeof globalThis !== 'undefined' ? globalThis : typeof this !== 'undefined' ? this : typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : global ",
    },
    module: { rules: [{ test: /\.ts$/, use: [{ loader: 'ts-loader' }] }] },
    performance: { hints: false },
    devServer: {
      static: { directory: '.' },
      port: 9000,
      proxy: [
        {
          context: ['/assets/jspdf.plugin.autotable.js'],
          target: 'http://localhost:9000/dist/',
          changeOrigin: true,
        },
      ],
    },
    plugins: [
      new webpack.BannerPlugin(`
              jsPDF AutoTable plugin v${newVersion}

              Copyright (c) ${currentYear} Simon Bengtsson, https://github.com/simonbengtsson/jsPDF-AutoTable
              Licensed under the MIT License.
              http://opensource.org/licenses/mit-license
          `),
    ],
    optimization: {
      minimizer: [new TerserPlugin({ extractComments: false })],
      minimize: !!minified,
    },
  }
}
