const modules = [
    './constant.js',
    './fetch_meals.js',
    './fetch_fooddata.js',
    './extract_nutrients.js'
  ];
  
  // Function to attach all exports to window
  async function attachToWindow() {
    for (const modulePath of modules) {
      const module = await import(modulePath);
  
      // Attach each export to window
      Object.keys(module).forEach(exportName => {
        window[exportName] = module[exportName];
      });
    }
  }
  
  // Call the function to attach everything to window
  attachToWindow();