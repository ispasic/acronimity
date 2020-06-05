module.exports = {
  apps : [{
    name: 'pubmedacronyms-frontend',
    script: 'node_modules/@angular/cli/bin/ng',
    args: 'serve --port 4203',
    instances: 1,
    autorestart: true,
    watch: '.'
  }],

  deploy : {
  }
};
