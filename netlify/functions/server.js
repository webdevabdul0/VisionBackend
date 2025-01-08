const express = require("express");
const multer = require("multer");
const vision = require("@google-cloud/vision");
const fs = require("fs");
const cors = require("cors");
require("dotenv").config();
const serverless = require("serverless-http");

const app = express();

// Parse the GOOGLE_API_KEY_JSON environment variable
const googleApiKey = JSON.parse(process.env.GOOGLE_API_KEY_JSON);

// Google Cloud Vision API client setup
const client = new vision.ImageAnnotatorClient({
  credentials: googleApiKey, // Pass the credentials directly
});
app.use(
  cors({
    origin: "*", // Allow requests from any origin (adjust this for production)
    methods: ["GET", "POST"], // Allow GET and POST methods
    allowedHeaders: ["Content-Type", "Authorization"], // Allow specific headers
  })
);

// Set up multer for file uploads
const upload = multer({
  dest: "/tmp/uploads/", // Temporary upload directory for Netlify
});

// Base path adjustment for Netlify Functions
const router = express.Router();

const disposal_methods = {
  aerosol_cans: {
    keywords: [
      "aerosol",
      "spray can",
      "deodorant can",
      "paint can",
      "compressed gas can",
      "spray paint",
      "air freshener can",
      "aerosol spray",
      "paint spray",
      "gas can",
    ],
    disposal:
      "Make sure the can is completely empty before disposal. If it's not recyclable, check with your local recycling program for hazardous waste options. Some aerosol cans can be refilled, so consider reusing them instead of discarding them. If you are unsure, contact your waste disposal center for further instructions.",
  },
  aluminum_food_cans: {
    keywords: [
      "aluminum can",
      "food tin",
      "metal can",
      "canned food",
      "soup can",
      "vegetable can",
      "aluminum tin",
      "food container",
      "aluminum food container",
    ],
    disposal:
      "Rinse the can thoroughly to remove any food residue to avoid contamination. Place it in your recycling bin. Crushing the can is optional, but it helps save space. Ensure that there is no food left inside, as food waste can spoil the recycling process. If your program doesn’t accept aluminum, dispose of it properly as scrap metal.",
  },
  aluminum_soda_cans: {
    keywords: [
      "soda can",
      "beverage can",
      "aluminum drink can",
      "soft drink can",
      "cola can",
      "energy drink can",
      "beer can",
      "aluminum soda can",
      "carbonated drink can",
    ],
    disposal:
      "Rinse the can to remove any sticky residue. Place it in your recycling bin. Avoid crushing it if your recycling program requires intact cans for sorting. If your area doesn’t accept aluminum cans, dispose of them in a way that prevents contamination in other recycling materials.",
  },
  cardboard_boxes: {
    keywords: [
      "cardboard",
      "box",
      "packaging box",
      "shipping box",
      "moving box",
      "cardboard packaging",
      "corrugated box",
      "flat box",
      "cardboard container",
      "carton box",
    ],
    disposal:
      "Flatten the box to save space before recycling. Remove any non-cardboard elements like tape, labels, and plastic inserts. If the box has food residue or heavy staining, it may not be recyclable and should be disposed of as waste. Check with your local program to confirm guidelines.",
  },
  cardboard_packaging: {
    keywords: [
      "cardboard packaging",
      "cardboard box",
      "shipping box",
      "packaging material",
      "carton",
      "corrugated cardboard",
      "pizza box",
      "box packaging",
      "paperboard",
    ],
    disposal:
      "Ensure all packaging is flattened and cleaned for easy recycling. Remove non-cardboard components such as plastic films, foam, or metal. Check with local programs to ensure that your cardboard packaging meets the recycling standards. Recycle with other paper and cardboard materials where available.",
  },
  clothing: {
    keywords: [
      "clothes",
      "fabric",
      "textiles",
      "garments",
      "clothing",
      "apparel",
      "shoes",
      "jackets",
      "shirts",
      "pants",
      "skirts",
      "clothing items",
      "dresses",
      "socks",
      "jeans",
      "coat",
      "scarf",
      "sweater",
    ],
    disposal:
      "If the clothing is still wearable, consider donating to local charities or thrift stores. For items that are damaged or no longer usable, check if there are textile recycling bins in your area. Many programs offer recycling for fabric and clothing materials. Avoid throwing clothes in the trash as they can be repurposed or recycled into new fabrics.",
  },
  coffee_grounds: {
    keywords: [
      "coffee grounds",
      "coffee filter",
      "used coffee",
      "coffee beans",
      "coffee powder",
      "coffee waste",
      "grounds",
      "brewed coffee grounds",
      "coffee grounds compost",
    ],
    disposal:
      "Coffee grounds are rich in nutrients and can be composted. Add them to your compost bin or directly into your garden soil to enhance plant growth. If composting isn’t an option, dispose of them in organic waste bins. Coffee filters are also compostable if they are paper-based. Avoid placing them in regular waste bins to reduce landfill impact.",
  },
  disposable_plastic_cutlery: {
    keywords: [
      "plastic cutlery",
      "plastic spoon",
      "plastic fork",
      "disposable utensil",
      "plastic knife",
      "plastic tableware",
      "single-use cutlery",
      "plastic knife",
      "fork",
      "spoon",
    ],
    disposal:
      "Most disposable plastic cutlery is not recyclable. Place it in the general waste bin. Consider switching to reusable or compostable alternatives to reduce plastic waste. Some programs may accept compostable plastics; always check local guidelines for your specific area. Avoid using single-use plastic cutlery whenever possible.",
  },
  eggshells: {
    keywords: [
      "eggshells",
      "eggs",
      "egg shells",
      "used eggshell",
      "egg carton",
      "cracked eggshell",
      "egg shell waste",
      "eggshell composting",
    ],
    disposal:
      "Eggshells can be composted as they are rich in calcium and beneficial for soil. Add them to your compost bin after rinsing. If composting is not possible, place them in organic waste bins. Ensure that no egg residue remains on the shell before disposal to avoid attracting pests in composting bins.",
  },
  food_waste: {
    keywords: [
      "food",
      "leftovers",
      "organic waste",
      "kitchen scraps",
      "fruit peels",
      "vegetable scraps",
      "food compost",
      "food waste",
      "scraps",
      "composting",
      "food leftovers",
    ],
    disposal:
      "Separate food waste from packaging before disposal. Compost food scraps if possible to reduce landfill impact. Use organic waste bins where available to ensure proper disposal. If composting is not an option, dispose of food waste in green bins or waste programs that accept organic material. Reduce food waste by considering portion control and proper food storage.",
  },
  glass_beverage_bottles: {
    keywords: [
      "glass bottle",
      "beverage bottle",
      "wine bottle",
      "beer bottle",
      "liquor bottle",
      "glass drink bottle",
      "glass jar",
      "beverage container",
      "glass drink container",
    ],
    disposal:
      "Rinse thoroughly to remove any liquid residue before recycling. Place the bottle in your glass recycling bin. Remove caps or lids if not made of glass. Broken glass should be wrapped in paper or cardboard and placed in general waste. If the bottle is contaminated with food or residue, clean it thoroughly before disposal.",
  },
  glass_cosmetic_containers: {
    keywords: [
      "glass container",
      "cosmetic bottle",
      "glass jar",
      "perfume bottle",
      "cosmetic jar",
      "beauty container",
      "skincare container",
      "cosmetic packaging",
    ],
    disposal:
      "Clean the container to ensure it's free from any residue. Recycle it if your local program accepts glass containers. If the container is broken, wrap it in paper or cardboard and place it in general waste. Some cosmetic containers may have metal or plastic parts; remove them before recycling.",
  },
  glass_food_jars: {
    keywords: [
      "glass jar",
      "food jar",
      "preserve jar",
      "mason jar",
      "jam jar",
      "pickle jar",
      "sauce jar",
      "spice jar",
      "canning jar",
      "glass container",
    ],
    disposal:
      "Rinse the jar to remove any food residue. Recycle in glass bins. If the lid is made of metal, it can often be recycled separately. If the jar contains any non-recyclable elements like labels or plastic lids, remove them before recycling.",
  },
  magazines: {
    keywords: [
      "magazine",
      "magazines",
      "periodical",
      "journal",
      "newsprint",
      "publication",
      "book",
      "printed material",
      "fashion magazine",
      "tech magazine",
      "sports magazine",
    ],
    disposal:
      "Remove plastic covers or non-paper elements before recycling. Place magazines in your paper recycling bin. Ensure they are dry and free from food stains, as wet magazines are difficult to recycle. If magazines have excessive adhesive or plastic, they may not be recyclable, so it's important to check the recycling guidelines.",
  },
  newspaper: {
    keywords: [
      "newspaper",
      "newsprint",
      "paper",
      "printed paper",
      "daily news",
      "tabloid",
      "broadsheet",
      "newspaper article",
      "news paper",
      "local newspaper",
    ],
    disposal:
      "Keep newspapers dry and free of contaminants like food stains. Recycle them in designated paper bins. Bundle them for easier handling if required. If the newspaper has a lot of non-recyclable materials like glossy pages or adhesives, dispose of them according to local recycling guidelines.",
  },
  office_paper: {
    keywords: [
      "office paper",
      "printer paper",
      "notebook",
      "letterhead",
      "printer ink",
      "shredded paper",
      "office supplies",
      "printed paper",
      "writing paper",
      "cardstock",
      "copy paper",
    ],
    disposal:
      "Shred confidential documents before recycling if necessary. Avoid including paper with heavy lamination or plastic content. Recycle in paper bins designated for office paper. If your office paper is contaminated with food or liquids, it may not be recyclable, so keep it clean before disposal.",
  },
  paper_cups: {
    keywords: [
      "paper cup",
      "coffee cup",
      "disposable cup",
      "takeout cup",
      "coffee container",
      "paper beverage cup",
      "paper drink cup",
      "paper cup with lid",
      "cardboard cup",
    ],
    disposal:
      "Check for a recycling symbol to confirm if recyclable. Most paper cups with plastic lining are not recyclable and go into general waste. Consider switching to reusable cups. If recycling is available, dispose of paper cups properly to reduce the environmental impact. Be aware that not all paper cups can be recycled due to the plastic lining.",
  },
  plastic_cups: {
    keywords: [
      "plastic cup",
      "disposable plastic cup",
      "beverage cup",
      "drinking cup",
      "takeout cup",
      "plastic drink cup",
      "single-use plastic cup",
      "styrofoam cup",
      "plastic cup container",
    ],
    disposal:
      "Check if your local program accepts recyclable plastics. If it is not recyclable, dispose of it in the general waste bin. Avoid using single-use plastic cups; opt for reusable cups or bottles to reduce waste. If the cup has a plastic lining or is a food container, make sure to check the recycling guidelines before disposal.",
  },

  plastic_cup_lids: {
    keywords: [
      "plastic lid",
      "cup lid",
      "disposable lid",
      "beverage lid",
      "plastic beverage lid",
      "takeout lid",
      "coffee cup lid",
      "soda lid",
      "plastic top",
    ],
    disposal:
      "If marked recyclable, clean and place them in the appropriate bin. Otherwise, dispose of in general waste. Avoid using single-use lids when possible. Consider opting for reusable lids or cups.",
  },
  plastic_detergent_bottles: {
    keywords: [
      "plastic detergent bottle",
      "laundry detergent bottle",
      "plastic bottle",
      "detergent container",
      "cleaning supply bottle",
      "plastic cleaning bottle",
    ],
    disposal:
      "Rinse out any remaining detergent to avoid contamination. Check the recycling symbol and place in plastics recycling. Keep the lid on if acceptable. Always check local recycling guidelines, as detergent bottles may have special requirements.",
  },
  plastic_food_containers: {
    keywords: [
      "plastic food container",
      "plastic food box",
      "takeout container",
      "plastic storage container",
      "disposable food container",
      "plastic lunchbox",
      "food packaging",
    ],
    disposal:
      "Ensure the container is clean and free of food residue. Recycle if marked as recyclable. Otherwise, dispose of in general waste. Consider using reusable containers to reduce single-use plastics.",
  },
  plastic_shopping_bags: {
    keywords: [
      "plastic shopping bag",
      "grocery bag",
      "plastic carry bag",
      "disposable bag",
      "shopping bag",
      "plastic sack",
    ],
    disposal:
      "Reuse them for storage or garbage liners. If recycling facilities for plastic bags are available, drop them off. Avoid throwing in general recycling bins, as most programs do not accept plastic bags. Consider using reusable bags for shopping.",
  },
  plastic_soda_bottles: {
    keywords: [
      "plastic soda bottle",
      "soda bottle",
      "plastic beverage bottle",
      "carbonated drink bottle",
      "soft drink bottle",
      "plastic drink bottle",
      "cola bottle",
    ],
    disposal:
      "Empty and rinse the bottle before recycling. Leave the cap on if your recycling program accepts it. Crush the bottle to save space if desired. Avoid leaving sugary residues inside, as this can contaminate the recycling process.",
  },
  plastic_straws: {
    keywords: [
      "plastic straw",
      "disposable straw",
      "drinking straw",
      "single-use straw",
      "plastic drinking straw",
    ],
    disposal:
      "Plastic straws are not recyclable in most programs. Dispose of them in general waste. Consider using reusable or biodegradable straws to reduce plastic waste.",
  },
  plastic_trash_bags: {
    keywords: [
      "plastic trash bag",
      "garbage bag",
      "disposable trash bag",
      "plastic liner",
      "waste bag",
      "bin liner",
    ],
    disposal:
      "Trash bags themselves are not recyclable. Dispose of them in general waste along with their contents. Look for biodegradable options when purchasing new ones to reduce plastic pollution.",
  },
  plastic_water_bottles: {
    keywords: [
      "plastic water bottle",
      "plastic bottle",
      "water bottle",
      "recyclable plastic bottle",
      "disposable water bottle",
      "single-use water bottle",
    ],
    disposal:
      "Rinse the bottle to ensure cleanliness. Recycle the bottle along with the cap if accepted. Try to use reusable bottles to reduce plastic waste. Refrain from throwing away bottles that can be reused or recycled.",
  },
  shoes: {
    keywords: [
      "shoes",
      "footwear",
      "sneakers",
      "sandals",
      "boots",
      "high heels",
      "flip flops",
      "sports shoes",
      "running shoes",
    ],
    disposal:
      "Donate shoes that are still wearable to charities or thrift stores. For damaged or unusable shoes, check for textile recycling bins. Avoid discarding in general waste. If shoes have no recycling option, dispose of them responsibly.",
  },
  steel_food_cans: {
    keywords: [
      "steel food can",
      "steel can",
      "food can",
      "tin can",
      "canned food",
      "soup can",
      "vegetable can",
      "steel tin",
      "metal food can",
    ],
    disposal:
      "Clean the can by removing all food residue. Place it in your recycling bin. Check for local recycling guidelines if needed. Steel food cans are generally accepted in most recycling programs, but ensure they are properly cleaned.",
  },
  styrofoam_cups: {
    keywords: [
      "styrofoam cup",
      "foam cup",
      "disposable foam cup",
      "coffee cup",
      "takeout cup",
      "styrofoam beverage cup",
      "polystyrene cup",
    ],
    disposal:
      "Styrofoam is not recyclable in most areas. Dispose of it in general waste. Avoid using Styrofoam products whenever possible. Choose alternatives such as paper or reusable cups to reduce environmental impact.",
  },
  styrofoam_food_containers: {
    keywords: [
      "styrofoam container",
      "foam food container",
      "disposable foam food box",
      "takeout container",
      "polystyrene food container",
      "styrofoam tray",
    ],
    disposal:
      "Clean the container before disposal if required. Place it in general waste as Styrofoam is typically non-recyclable. Consider switching to sustainable alternatives like biodegradable or compostable containers.",
  },
  tea_bags: {
    keywords: [
      "tea bags",
      "used tea bags",
      "tea leaves",
      "tea pouch",
      "herbal tea bag",
      "green tea bag",
      "black tea bag",
      "biodegradable tea bag",
    ],
    disposal:
      "Compost biodegradable tea bags as they are rich in organic matter. Check if your tea bags have plastic components and dispose of those in general waste. Some tea bags are non-compostable due to synthetic materials, so always check the packaging for details.",
  },
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
router.post("/classify", upload.single("image"), async (req, res) => {
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
        //     rawlabels: labels,
        category: match.category,
        disposalMethod: match.disposal,
      });
    } else {
      res.json({
        //    rawlabels: labels,
        category: "Unknown",
        disposalMethod:
          "Unable to classify. Please consult a local waste management facility.",
      });
    }
  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ error: "Failed to process the image." });
  }
});

// Use the router for all routes
app.use("/.netlify/functions/server", router);

// Export the handler for serverless deployment
module.exports.handler = serverless(app);
