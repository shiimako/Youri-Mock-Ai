const fs = require('fs');
const path = require('path');

// 1. Tentukan nama file sumber
const SOURCE_DATA = 'dataset_opsi_1_final_with_images.json';
const KAMUS_FILE = 'kamus_master_resep.json';

console.log("🌸 Yuki sedang memanaskan mesin Ekstraktor Pintar...");

try {
  // 2. Baca file JSON Dataset & Kamus
  const rawDataset = fs.readFileSync(path.join(__dirname, SOURCE_DATA), 'utf8');
  const dataset = JSON.parse(rawDataset);

  const rawKamus = fs.readFileSync(path.join(__dirname, KAMUS_FILE), 'utf8');
  const kamusData = JSON.parse(rawKamus);
  const kamusGrup = kamusData.kamus_grup_resep;

  // 3. Mapping Nama Kategori agar Estetik di UI
  const categoryDisplayNames = {
    "indonesian": "Indonesian",
    "western": "Western",
    "asian": "Asian",
    "middle_eastern": "Middle Eastern",
    "main_course": "Main Course",
    "appetizer": "Appetizer",
    "dessert": "Dessert",
    "snack": "Snack",
    "beverage": "Beverage",
    "goreng": "Goreng",
    "rebus_kuah": "Rebus & Kuah",
    "bakar_panggang": "Bakar & Panggang",
    "tumis": "Tumis"
  };

  // 4. Siapkan Aturan Pemindaian (Flatten Dictionary)
  const categoryRules = [];
  for (const group in kamusGrup) {
    for (const key in kamusGrup[group]) {
      categoryRules.push({
        displayName: categoryDisplayNames[key] || key,
        // Ubah semua keyword jadi huruf kecil agar kebal dari typo huruf kapital
        keywords: kamusGrup[group][key].map(k => k.toLowerCase())
      });
    }
  }

  // ==========================================
  // EKSTRAK 1: INGREDIENTS MASTER
  // ==========================================
  const ingredientsMaster = dataset.data_ingredients_master.map(ing => ({
    ingredient_id: ing.ingredient_id,
    clean_name: ing.clean_name,
    display_name: ing.display_name,
    food_group: ing.food_group,
    flavor_vector: ing.flavor_vector
  }));

  // ==========================================
  // EKSTRAK 2: RESEP & AUTO-CATEGORIZATION
  // ==========================================
  const categoryCounter = {}; 
  
  const recipes = dataset.data_recipes_mapped.map(recipe => {
    
    // 💡 YUKI'S MAGIC: Gabungkan Judul dan Nama Bahan jadi satu teks panjang untuk dipindai!
    const recipeTextBuffer = recipe.title + " " + recipe.ingredients.map(i => i.name).join(" ");
    const textToScan = recipeTextBuffer.toLowerCase();
    
    const matchedCategories = new Set(); // Pakai Set agar tidak ada kategori ganda (duplicate)

    // A. Proses Scanning Pintar
    categoryRules.forEach(rule => {
      for (const keyword of rule.keywords) {
        // Cek jika keyword dari kamus DS nyangkut di teks resep
        if (textToScan.includes(keyword)) {
          matchedCategories.add(rule.displayName);
          break; // Kalau sudah ketemu 1 keyword untuk kategori ini, lanjut ke kategori lain
        }
      }
    });

    // Fallback: Kalau AI gagal menemukan kata kunci sama sekali, beri nilai default
    if (matchedCategories.size === 0) {
      matchedCategories.add("Main Course");
      matchedCategories.add("Indonesian");
    }

    // Ubah Set kembali menjadi Array
    const finalCategories = Array.from(matchedCategories);

    // B. Hitung Usage Count untuk Category Master
    finalCategories.forEach(catName => {
      if (!categoryCounter[catName]) {
        categoryCounter[catName] = 0;
      }
      categoryCounter[catName] += 1;
    });

    // C. Format Resep Final
    return {
      author_id: recipe.author_id.$oid || recipe.author_id, 
      title: recipe.title,
      image_url: recipe.image_url,
      cook_time_mins: recipe.cook_time_mins,
      description: recipe.description,
      categories: finalCategories, // 🌟 TIMPA DENGAN KATEGORI BARU YANG PINTAR!
      steps: recipe.steps,
      ingredients: recipe.ingredients,
      status: recipe.status || "published"
    };
  });

  // ==========================================
  // EKSTRAK 3: MAPPING CATEGORY MASTER
  // ==========================================
  let catIndex = 1;
  const categoriesMaster = Object.keys(categoryCounter).map(catName => {
    const categoryId = `CAT-${String(catIndex).padStart(3, '0')}`;
    catIndex++;
    
    return {
      category_id: categoryId,
      name: catName,
      usage_count: categoryCounter[catName]
    };
  });

  // ==========================================
  // SIMPAN KE 3 FILE JSON BARU
  // ==========================================
  console.log("🌸 Menulis data yang sudah bersih ke file...");
  
  fs.writeFileSync('seed_result/ingredients.json', JSON.stringify(ingredientsMaster, null, 2), 'utf8');
  console.log("✅ Berhasil membuat: ingredients.json");

  fs.writeFileSync('seed_result/seed_resep.json', JSON.stringify(recipes, null, 2), 'utf8');
  console.log("✅ Berhasil membuat: seed_resep.json");

  fs.writeFileSync('seed_result/mapping_recipe_category.json', JSON.stringify(categoriesMaster, null, 2), 'utf8');
  console.log("✅ Berhasil membuat: mapping_recipe_category.json");

  console.log("🎉 Kerja bagus! Resep-resep Senpai sekarang punya kategori yang jauh lebih akurat dan beragam!");

} catch (error) {
  console.error("❌ Gagal mengekstrak data:", error.message);
}