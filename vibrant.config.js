module.exports = {
  // Directories to ignore during analysis
  ignore: ['node_modules', '.git', 'dist', '.next'],
  
  // Output format: 'pretty', 'json', or 'compact'
  format: 'pretty',
  
  // Rules configuration
  rules: {
    'generic-comment': 'warn',
    'generic-variable-name': 'info',
    'no-explicit-any': 'warn',
  }
};
