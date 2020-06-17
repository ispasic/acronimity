module.exports = {
  apps : [{
    script: 'serve',
    name: '4203-pubmedacronyms-frontend',
    env: {
      PM2_SERVE_PATH: 'dist/pubmedapis',
      PM2_SERVE_PORT: 4203,
      PM2_SERVE_SPA: 'true',
      //PM2_SERVE_HOMEPAGE: 'dist/firstaidcu/index.html'
    }
  },
  {
    script: 'backend/server.js',
    name: '8083-pubmedacronyms-backend'
  }]
};
