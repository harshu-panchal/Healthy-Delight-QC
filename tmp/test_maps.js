import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Navigate to the local dev server
  await page.goto('http://localhost:5174/', { waitUntil: 'networkidle' });
  
  // Wait for google maps to load
  try {
    await page.waitForFunction(() => window.google && window.google.maps && window.google.maps.places, { timeout: 10000 });
  } catch (e) {
    console.log("places did not load", e);
  }
  
  const result = await page.evaluate(() => {
    return {
      hasPlaceAutocompleteElement: typeof window.google?.maps?.places?.PlaceAutocompleteElement !== 'undefined',
      hasAutocomplete: typeof window.google?.maps?.places?.Autocomplete !== 'undefined',
      hasAutocompleteService: typeof window.google?.maps?.places?.AutocompleteService !== 'undefined',
    };
  });
  
  console.log('Result:', result);
  await browser.close();
})();
