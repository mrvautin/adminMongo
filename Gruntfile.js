module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    express: {
      dev: {
        options: {
          script: 'app.js',
        }
      }
    },
    watch: {
      scripts: {
        files: ['*.js','config/*.json', 'locales/*.js' ,'routes/*.js', 'tests/*.js'],
        tasks: ['express:dev'],
        options: {
          spawn: false,
        },
      },
      
    },
    

  });

  grunt.loadNpmTasks('grunt-express-server');
  grunt.loadNpmTasks('grunt-contrib-watch');

  // Default task(s).
  grunt.registerTask('default', ['express', 'watch']);

};