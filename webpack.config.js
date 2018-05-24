const path = require("path");

module.exports = {
    entry: {
        app: path.join(__dirname, "src/index.tsx"),
        eventPage: path.join(__dirname, "src/eventPage.tsx"),
        auth: path.join(__dirname, "src/auth.ts"),
        menu: path.join(__dirname, "src/Menu.tsx")
    },
    devtool: "inline-source-map",
    output: {
        path: path.join(__dirname, "dist/js"),
        filename: "[name].js"
    },
    module: {
        rules: [
            {
                exclude: /node_modules/,
                test: /\.tsx?$/,
                use: "ts-loader"
            },
             {
                test: /\.css$/,
                use: [
                  require.resolve('style-loader'),
                  {
                    loader: require.resolve('css-loader'),
                    options: {
                      importLoaders: 1,
                    },
                  },
                ],
              }
        ]
        },
    resolve: {
        extensions: [".ts", ".tsx", ".js"]
    }
};
