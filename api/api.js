export * from './constant.js';
export * from './fooddata.js';
export * from './meals.js';
export * from './nutrients.js';


const modules = [
    './constant.js',
    './meals.js',
    './fooddata.js',
    './nutrients.js'
  ];


  // DEBUG PURPOSES ONLY
  async function attachToWindow() {
    for (const modulePath of modules) {
      const module = await import(modulePath);
  
      // Attach each export to window
      Object.keys(module).forEach(exportName => {
        console.log(exportName)
        window[exportName] = module[exportName];
      });
    }
  }
  
  // Call the function to attach everything to window
  attachToWindow();