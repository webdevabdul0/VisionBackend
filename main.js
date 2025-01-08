const express = require("express");
const multer = require("multer");
const vision = require("@google-cloud/vision");
const fs = require("fs");
const path = require("path");

const app = express();

// Google Cloud Vision API client setup
const client = new vision.ImageAnnotatorClient({
  keyFilename: "./ApiKey.json",
});

// Set up multer for file uploads
const upload = multer({
  dest: "uploads/", // Temporary upload directory
});

const disposal_methods = {
  aerosol_cans: {
    keywords: ["aerosol", "spray can", "deodorant can"],
    disposal:
      "Make sure the can is empty before disposal. Check with your local recycling program for acceptance. If not recyclable, dispose of as hazardous waste.",
  },
  aluminum_food_cans: {
    keywords: ["aluminum can", "food tin", "metal can"],
    disposal:
      "Rinse the can thoroughly to remove any food residue. Place it in your recycling bin. Crushing the can saves space but is optional.",
  },
  aluminum_soda_cans: {
    keywords: ["soda can", "beverage can", "aluminum drink can"],
    disposal:
      "Rinse to remove sticky residue. Place the can in your recycling bin. Avoid crushing if your recycling program requires intact cans.",
  },
  cardboard_boxes: {
    keywords: ["cardboard", "box", "packaging box"],
    disposal:
      "Flatten the box to save space before recycling. Remove any non-cardboard elements like tape or labels. Place in the recycling bin for paper/cardboard.",
  },
  glass_beverage_bottles: {
    keywords: ["glass bottle", "beverage bottle", "wine bottle", "beer bottle"],
    disposal:
      "Rinse thoroughly to remove any liquid. Place in the glass recycling bin. Remove caps or lids if not made of glass.",
  },
  plastic_water_bottles: {
    keywords: ["plastic bottle", "water bottle", "drink bottle"],
    disposal:
      "Rinse the bottle to ensure cleanliness. Recycle the bottle along with the cap if accepted. Try to use reusable bottles to reduce plastic waste.",
  },
  food_waste: {
    keywords: ["food", "leftovers", "organic waste", "kitchen scraps"],
    disposal:
      "Separate food waste from packaging before disposal. Compost if possible to reduce landfill impact. Use organic waste bins where available.",
  },
  clothing: {
    keywords: ["clothes", "fabric", "textiles", "garments", "clothing"],
    disposal:
      "If still wearable, consider donating to local charities or thrift stores. For damaged clothing, recycle as fabric or take to textile recycling bins. Avoid placing in general waste.",
  },
  plastic_shopping_bags: {
    keywords: ["plastic bag", "shopping bag", "grocery bag"],
    disposal:
      "Reuse them for storage or garbage liners. If recycling facilities for plastic bags are available, drop them off. Avoid throwing in general recycling bins.",
  },
  styrofoam_food_containers: {
    keywords: ["styrofoam", "foam box", "takeout container"],
    disposal:
      "Clean the container before disposal if required. Place it in general waste as Styrofoam is typically non-recyclable. Consider switching to sustainable alternatives.",
  },
  tea_bags: {
    keywords: ["tea bag", "used tea bag", "compostable tea"],
    disposal:
      "Compost biodegradable tea bags as they are rich in organic matter. Check if your tea bags have plastic components and dispose of those in general waste.",
  },
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
  }
});

// Start the server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://127.0.0.1:${PORT}`);
});
