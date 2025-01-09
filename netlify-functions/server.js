const express = require("express");
const multer = require("multer");
const vision = require("@google-cloud/vision");
const fs = require("fs");
require("dotenv").config();
const serverless = require("serverless-http");

const app = express();

// Google Cloud Vision API client setup
const client = new vision.ImageAnnotatorClient({
  keyFilename: process.env.GOOGLE_API_KEY_PATH,
});

// Set up multer for file uploads
const upload = multer({
  dest: "/tmp/uploads/", // Temporary upload directory for Netlify
});

const disposal_methods = {
  aerosol_cans: {
    keywords: ["spray can", "deodorant can", "air freshener", "aerosol container", "shaving foam", "cleaning spray", "hairspray", "paint spray", "insecticide can", "disinfectant can", "whipped cream can", "spray paint", "compressed air", "propellant can", "chemical spray", "maintenance spray", "rust remover", "lubricant can", "fabric spray", "odor spray", "cleaning product can"],
    disposal: "Make sure the can is empty before disposal. Check with your local recycling program for acceptance. If not recyclable, dispose of as hazardous waste.",
  },
  aluminum_food_cans: {
    keywords: ["tin can", "food tin", "aluminum can", "metal food can", "soup can", "vegetable can", "fruit can", "tuna can", "beverage can", "cooking oil can", "empty can", "canned food container", "recycling aluminum", "metal container", "crushed can", "soda can", "lunch meat can", "food storage tin", "cooking tin", "drink can", "canned food packaging"],
    disposal: "Rinse the can thoroughly to remove any food residue. Place it in your recycling bin. Crushing the can saves space but is optional.",
  },
  aluminum_soda_cans: {
    keywords: ["soda can", "aluminum drink can", "beverage can", "soft drink can", "cola can", "energy drink can", "sparkling water can", "canned soda", "canned beverage", "fizzy drink can", "carbonated drink can", "pop can", "iced tea can", "lemonade can", "beverage container", "cold drink can", "aluminum beverage container", "drink packaging", "soda packaging", "sparkling beverage can", "canned soda drink"],
    disposal: "Rinse to remove sticky residue. Place the can in your recycling bin. Avoid crushing if your recycling program requires intact cans.",
  },
  cardboard_boxes: {
    keywords: ["cardboard", "cardboard box", "packaging box", "moving box", "shipping box", "storage box", "corrugated box", "cardboard packaging", "flat box", "shipping container", "packing material", "recycled cardboard", "cardboard case", "carton", "cardboard packaging material", "gift box", "paper box", "large box", "cardboard crate", "bulk packaging", "corrugated cardboard"],
    disposal: "Flatten the box to save space before recycling. Remove any non-cardboard elements like tape or labels. Place in the recycling bin for paper/cardboard.",
  },
  cardboard_packaging: {
    keywords: ["cardboard packaging", "packing material", "cardboard wrapper", "product packaging", "product box", "shipping material", "box packaging", "cardboard wrap", "corrugated wrap", "packaging carton", "protective packaging", "corrugated material", "shipping carton", "box material", "flat packaging", "box wrap", "recycled cardboard", "paperboard", "paper packaging", "food packaging", "cardboard protector"],
    disposal: "Ensure all packaging is flattened for easy recycling. Remove non-cardboard parts such as plastic film or foam. Recycle with other cardboard materials.",
  },
  clothing: {
    keywords: ["clothes", "fabric", "textiles", "garments", "apparel", "shirts", "pants", "shoes", "jackets", "skirts", "dresses", "sweaters", "fabric waste", "fashion", "second-hand clothes", "used clothing", "old clothes", "worn clothing", "fabric recycling", "clothing donations", "fashion items"],
    disposal: "If still wearable, consider donating to local charities or thrift stores. For damaged clothing, recycle as fabric or take to textile recycling bins. Avoid placing in general waste.",
  },
  coffee_grounds: {
    keywords: ["coffee beans", "used coffee grounds", "coffee filter", "espresso grounds", "coffee waste", "spent coffee grounds", "coffee maker waste", "leftover coffee", "coffee residue", "organic coffee grounds", "used filter coffee", "ground coffee waste", "coffee grounds compost", "brewed coffee grounds", "morning coffee residue", "coffee grounds for gardening", "coffee grounds bin", "compostable coffee", "organic waste coffee", "recycled coffee grounds", "coffee trash"],
    disposal: "Coffee grounds are rich in nutrients and can be composted. Add them to your compost bin or garden soil. If composting is not an option, dispose of them in organic waste bins.",
  },
  disposable_plastic_cutlery: {
    keywords: ["plastic fork", "plastic spoon", "plastic knife", "disposable spoon", "disposable fork", "disposable knife", "plastic cutlery", "eating utensils", "plastic utensil", "single-use cutlery", "plastic tableware", "plastic eating utensil", "takeout utensil", "plastic straw", "single-use spoon", "disposable eating tools", "picnic cutlery", "disposable plates", "disposable cups", "plastic plate", "cutlery waste"],
    disposal: "Most disposable cutlery is not recyclable. Place it in the general waste bin. Consider switching to reusable or compostable alternatives in the future.",
  },
  eggshells: {
    keywords: ["eggshells", "broken eggshells", "cracked eggshells", "egg residue", "kitchen waste", "organic eggshells", "compostable eggshells", "eggshell compost", "eggshell waste", "natural fertilizer", "eggshells for soil", "organic material", "biodegradable waste", "eggshell composting", "kitchen scraps", "biodegradable eggs", "organic eggshells", "cracked egg", "eggshell grinding", "kitchen waste for composting", "gardening with eggshells"],
    disposal: "Eggshells can be composted and are great for enriching soil. Add them to your compost bin after rinsing. Alternatively, place in organic waste bins.",
  },
  food_waste: {
    keywords: ["food scraps", "organic waste", "leftovers", "kitchen scraps", "discarded food", "food leftovers", "waste food", "vegetable scraps", "fruit waste", "compostable waste", "food disposal", "food remnants", "expired food", "moldy food", "rotten food", "compostable food", "vegetable peelings", "food packaging waste", "compost waste", "food waste bins", "leftover meals"],
    disposal: "Separate food waste from packaging before disposal. Compost if possible to reduce landfill impact. Use organic waste bins where available.",
  },
  glass_beverage_bottles: {
    keywords: [
      "glass bottle", "beverage bottle", "wine bottle", "beer bottle", "soda bottle", 
      "glass container", "glass drink bottle", "liquor bottle", "juice bottle", 
      "sparkling water bottle", "beverage container", "empty glass bottle", 
      "glass packaging", "glass soda bottle", "glass beverage container", 
      "alcohol bottle", "glass jars", "clear glass bottle", "glass bottle packaging", 
      "recycled glass bottle", "drink bottle"
    ],
    disposal: "Rinse thoroughly to remove any liquid. Place in the glass recycling bin. Remove caps or lids if not made of glass.",
  },
  glass_cosmetic_containers: {
    keywords: [
      "glass jar", "cosmetic jar", "perfume bottle", "skincare container", 
      "lotion bottle", "serum container", "glass packaging", "beauty product container", 
      "fragrance bottle", "glass beauty bottle", "cosmetic packaging", 
      "glass makeup jar", "container for cream", "cosmetic glass", "beauty jar", 
      "perfume packaging", "glass container packaging", "refillable glass bottle", 
      "deodorant bottle", "glass makeup container", "glass toner bottle"
    ],
    disposal: "Clean the container to ensure it's residue-free. Recycle if your local program accepts glass containers. Broken glass should be wrapped in paper or cardboard and placed in general waste.",
  },
  glass_food_jars: {
    keywords: [
      "food jar", "glass jar", "jam jar", "jelly jar", "pickle jar", "sauce jar", 
      "pasta sauce jar", "condiment jar", "mason jar", "food storage jar", 
      "glass storage container", "pickle bottle", "sauce container", "jar packaging", 
      "jar packaging glass", "empty jar", "reusable jar", "sealed jar", "canning jar", 
      "food glass container", "glass preserving jar"
    ],
    disposal: "Rinse the jar to remove food residue. Recycle in glass bins. Lids made of metal can often be recycled separately.",
  },
  magazines: {
    keywords: [
      "magazines", "glossy magazines", "fashion magazines", "magazine covers", 
      "newspaper", "photo magazines", "publication", "reading material", 
      "periodicals", "printed magazine", "weekly magazine", "magazine subscriptions", 
      "magazine pages", "lifestyle magazines", "news magazines", "catalogues", 
      "printed media", "magazine paper", "print magazine", "glossy paper", 
      "fashion publications"
    ],
    disposal: "Remove plastic covers or non-paper elements before recycling. Place in your paper recycling bin. Avoid recycling if excessively wet or damaged.",
  },
  newspaper: {
    keywords: [
      "newspaper", "daily newspaper", "newspaper sheets", "print media", "local newspaper", 
      "paper news", "weekly newspaper", "local press", "broadsheet", "tabloid", 
      "printed news", "newspaper articles", "paper publications", "old newspaper", 
      "classified ads", "editorial paper", "local news", "print news", "newsprint", 
      "newspaper print", "yellowed paper"
    ],
    disposal: "Keep newspapers dry and free of contaminants like food stains. Recycle them in designated paper bins. Bundle them for easier handling if required.",
  },
  office_paper: {
    keywords: [
      "office paper", "printing paper", "copy paper", "documents", "printer paper", 
      "copier paper", "business paper", "letterhead", "office waste", "shredded paper", 
      "confidential paper", "used paper", "paper files", "paperwork", "manila folders", 
      "paper documents", "paper sheets", "recycled office paper", "stationery", 
      "paper waste", "office supplies"
    ],
    disposal: "Shred confidential documents if necessary before recycling. Avoid including paper with heavy lamination or plastic content. Recycle in paper bins.",
  },
  paper_cups: {
    keywords: [
      "paper cup", "disposable cup", "coffee cup", "takeaway cup", 
      "disposable beverage cup", "paper drink cup", "cardboard cup", "hot drink cup", 
      "cold drink cup", "eco-friendly cup", "disposable beverage container", 
      "tea cup", "drink container", "cup lid", "paper coffee cup", "takeout cup", 
      "recyclable cup", "paper soup cup", "food service cup", "paper tea cup", 
      "biodegradable cup"
    ],
    disposal: "Check for a recycling symbol to confirm if recyclable. Most paper cups with plastic lining are not recyclable and go into general waste. Consider switching to reusable cups.",
  },
  plastic_cup_lids: {
    keywords: [
      "plastic lid", "cup lid", "drink lid", "disposable lid", "plastic cup cover", 
      "plastic container lid", "food container lid", "drink packaging", "beverage lid", 
      "takeaway lid", "plastic takeout lid", "plastic film lid", "recyclable lid", 
      "food cup lid", "beverage cover", "reusable lid", "beverage cover lid", 
      "plastic food lid", "cup seal", "food packaging lid", "sealed cup lid"
    ],
    disposal: "If marked recyclable, clean and place them in the appropriate bin. Otherwise, dispose of general waste. Avoid using single-use lids when possible.",
  },
  plastic_detergent_bottles: {
    keywords: [
      "detergent bottle", "laundry detergent bottle", "cleaning product bottle", 
      "plastic container", "plastic cleaning bottle", "bleach bottle", "detergent packaging", 
      "laundry product bottle", "plastic wash bottle", "laundry container", 
      "cleaning supply bottle", "soap bottle", "bleach container", "bottle packaging", 
      "liquid soap bottle", "detergent waste", "laundry detergent packaging", 
      "household product bottle", "plastic wash container", "cleaning liquid container", 
      "plastic laundry bottle"
    ],
    disposal: "Rinse out any remaining detergent to avoid contamination. Check the recycling symbol and place it in plastics recycling. Keep the lid on if acceptable.",
  },
  plastic_food_containers: {
    keywords: [
      "plastic food container", "plastic container", "food storage container", 
      "Tupperware", "lunch container", "meal prep container", "plastic box", 
      "food box", "plastic food box", "food packaging", "disposable food container", 
      "takeaway container", "plastic lunch box", "sandwich container", "plastic jar", 
      "plastic packaging", "food storage", "sealed plastic container", "meal container", 
      "leftover container", "lunchbox"
    ],
    disposal: "Ensure the container is clean and free of food residue. Recycle if marked as recyclable. Otherwise, dispose of general waste."
  },
  plastic_shopping_bags: {
    keywords: [
      "plastic bag", "shopping bag", "grocery bag", "retail bag", "plastic carry bag",
      "disposable bag", "supermarket bag", "shopping pouch", "polyethylene bag", 
      "single-use bag", "plastic packaging", "takeout bag", "plastic tote", 
      "shopping pouch", "food carry bag", "recyclable bag", "reusable bag", 
      "polybag", "retail shopping bag", "packaging bag", "plastic sack"
    ],
    disposal: "Reuse them for storage or garbage liners. If recycling facilities for plastic bags are available, drop them off. Avoid throwing in general recycling bins.",
  },
  plastic_soda_bottles: {
    keywords: [
      "plastic soda bottle", "carbonated drink bottle", "plastic drink bottle", 
      "soda container", "plastic beverage bottle", "fizzy drink bottle", "cola bottle", 
      "sparkling water bottle", "plastic pop bottle", "soft drink bottle", 
      "beverage plastic container", "soda packaging", "fizzy beverage bottle", 
      "soda pop bottle", "drink packaging", "plastic cola bottle", "bottled soda", 
      "plastic beverage container", "carbonated beverage bottle", "bottle packaging", 
      "soda water bottle"
    ],
    disposal: "Empty and rinse the bottle before recycling. Leave the cap on if your recycling program accepts it. Crush the bottle to save space if desired.",
  },
  plastic_straws: {
    keywords: [
      "plastic straw", "disposable straw", "drinking straw", "single-use straw", 
      "plastic beverage straw", "drinking utensil", "straw packaging", "cocktail straw", 
      "plastic drinking utensil", "plastic drinking tool", "straw waste", "reusable straw", 
      "biodegradable straw", "plastic stirrer", "fast food straw", "straw lid", 
      "beverage straw", "sipping straw", "straw packaging waste", "straw dispenser", 
      "plastic drinking accessory"
    ],
    disposal: "Plastic straws are not recyclable in most programs. Dispose of them in general waste. Consider using reusable or biodegradable straws.",
  },
  plastic_trash_bags: {
    keywords: [
      "trash bag", "garbage bag", "plastic garbage bag", "waste bag", "rubbish bag", 
      "refuse bag", "black trash bag", "bin liner", "household trash bag", "plastic liner", 
      "disposable trash bag", "plastic refuse sack", "waste disposal bag", 
      "heavy-duty garbage bag", "clear trash bag", "biodegradable trash bag", 
      "single-use trash bag", "trash liner", "refuse container bag", "large trash bag", 
      "waste plastic bag"
    ],
    disposal: "Trash bags themselves are not recyclable. Dispose of them in general waste along with their contents. Look for biodegradable options when purchasing new ones.",
  },
  plastic_water_bottles: {
    keywords: [
      "plastic water bottle", "disposable water bottle", "drinking bottle", 
      "plastic bottle", "bottled water", "beverage bottle", "plastic drink container", 
      "water container", "bottled beverage", "plastic hydration bottle", "water packaging", 
      "single-use bottle", "sport drink bottle", "reusable water bottle", 
      "bottled mineral water", "plastic jug", "plastic canteen", "sports water bottle", 
      "bottled liquid", "bottle packaging", "water packaging"
    ],
    disposal: "Rinse the bottle to ensure cleanliness. Recycle the bottle along with the cap if accepted. Try to use reusable bottles to reduce plastic waste.",
  },
  shoes: {
    keywords: [
      "footwear", "shoes", "sneakers", "boots", "sandals", "flip-flops", "leather shoes", 
      "running shoes", "dress shoes", "high heels", "athletic shoes", "casual shoes", 
      "used shoes", "damaged shoes", "shoe donations", "second-hand shoes", "worn shoes", 
      "shoe recycling", "old shoes", "shoe box", "shoe waste"
    ],
    disposal: "Donate shoes that are still wearable to charities or thrift stores. For damaged or unusable shoes, check for textile recycling bins. Avoid discarding in general waste.",
  },
  steel_food_cans: {
    keywords: [
      "steel can", "food tin", "metal can", "steel container", "tin can", 
      "canned food", "soup tin", "vegetable tin", "metal food container", "beverage can", 
      "tuna tin", "steel packaging", "steel food container", "canned vegetable can", 
      "food storage tin", "canned meat", "food can", "steel soup can", 
      "food packaging metal", "steel beverage can", "recycled metal can"
    ],
    disposal: "Clean the can by removing all food residue. Place it in your recycling bin. Check for local recycling guidelines if needed.",
  },
  styrofoam_cups: {
    keywords: [
      "Styrofoam cup", "foam cup", "disposable cup", "foam drink cup", "coffee foam cup", 
      "takeaway foam cup", "foam beverage cup", "plastic foam cup", "foam coffee cup", 
      "Styrofoam container", "foam food container", "disposable foam cup", "hot drink cup", 
      "single-use foam cup", "insulated foam cup", "takeout foam cup", "beverage foam cup", 
      "food foam packaging", "foam packaging", "restaurant foam cup", "disposable foam container"
    ],
    disposal: "Styrofoam is not recyclable in most areas. Dispose of it in general waste. Avoid using Styrofoam products whenever possible.",
  },
  styrofoam_food_containers: {
    keywords: [
      "Styrofoam container", "foam box", "foam takeout container", "Styrofoam takeout box", 
      "disposable food container", "foam food box", "Styrofoam food tray", 
      "fast food container", "food packaging foam", "disposable food box", "foam packaging", 
      "takeout foam container", "food delivery packaging", "foam platter", "food tray", 
      "single-use foam box", "foam food tray", "takeout foam packaging", 
      "food packaging foam", "restaurant foam container", "Styrofoam takeaway container"
    ],
    disposal: "Clean the container before disposal if required. Place it in general waste as Styrofoam is typically non-recyclable. Consider switching to sustainable alternatives.",
  },
  tea_bags: {
    keywords: [
      "tea bag", "used tea bag", "biodegradable tea bag", "herbal tea bag", "black tea bag", 
      "green tea bag", "tea waste", "compostable tea bag", "tea leaf bag", "organic tea bag", 
      "tea bag waste", "reusable tea bag", "loose tea", "tea bag packaging", "tea bag wrapper", 
      "paper tea bag", "silk tea bag", "tea sachet", "flavored tea bag", "tea filter", 
      "herbal tea sachet"
    ],
    disposal: "Compost biodegradable tea bags as they are rich in organic matter. Check if your tea bags have plastic components and dispose of those in general waste."
  }
  // Add other categories with expanded keywords here...
};

// Function to match labels with categories
function matchCategory(labels) {
  for (const [category, { keywords, disposal }] of Object.entries(
    disposal_methods
  )) {
    if (
      labels.some((label) =>
        keywords.some((keyword) => label.includes(keyword))
      )
    ) {
      return { category, disposal };
    }
  }
  return null; // No match found
}

// Example usage in the endpoint
app.post("/classify", upload.single("image"), async (req, res) => {
  try {
    const filePath = req.file.path;

    // Perform label detection on the uploaded image
    const [result] = await client.labelDetection(filePath);
    const labels = result.labelAnnotations.map((label) =>
      label.description.toLowerCase()
    );

    // Clean up the uploaded file after processing
    fs.unlinkSync(filePath);

    // Match labels with disposal categories
    const match = matchCategory(labels);

    if (match) {
      res.json({
        rawlabels: labels,
        category: match.category,
        disposalMethod: match.disposal,
      });
    } else {
      res.json({
        rawlabels: labels,
        category: "Unknown",
        disposalMethod:
          "Unable to classify. Please consult a local waste management facility.",
      });
    }
  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ error: "Failed to process the image." });
  } finally {
    fs.unlinkSync(filePath); // Always clean up
  }
});

// Export the handler for serverless deployment
module.exports.handler = serverless(app);
