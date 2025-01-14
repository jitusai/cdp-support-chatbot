const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const cheerio = require("cheerio");
const app = express();

const axiosInstance = axios.create({
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  },
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static("public"));

app.set("view engine", "ejs");

// Home route
app.get("/", (req, res) => {
  res.render("index");
});

// Chatbot route
app.post("/chat", async (req, res) => {
  const userQuery = req.body.query.toLowerCase();

  // Check if the question is a comparison query
  if (userQuery.includes("compare")) {
    const comparisonResponse = await getComparison(userQuery);
    return res.json({ response: comparisonResponse });
  }

  // Otherwise, process as a regular "how-to" question
  const response = await getAnswerFromDocs(userQuery);
  res.json({ response });
});

// Function to fetch and process documentation
async function getAnswerFromDocs(query) {
  let url = "";
  let response = "";
  // Default URL setup based on the query
  if (query.includes("segment")) {
    url = "https://segment.com/docs/?ref=nav";
    response = await fetchDocumentation(url, query);
  } else if (query.includes("mparticle")) {
    url = "https://docs.mparticle.com/";
    response = await fetchDocumentation(url, query);
  } else if (query.includes("lytics")) {
    url = "https://docs.lytics.com/";
    response = await fetchDocumentation(url, query);
  } else if (query.includes("zeotap")) {
    url = "https://docs.zeotap.com/home/en-us/";
    response = await fetchDocumentation(url, query);
  } else {
    response = { message: "Sorry, I can't guide to this irrelevant question." };
  }
  return response;
}
async function fetchDocumentation(url, query) {
  try {
    //console.log(`Fetching documentation from: ${url}`);
    const { data } = await axiosInstance.get(url);
    const $ = cheerio.load(data);
    console.log("Fetched HTML:", data);
    // Searching through the documentation for relevant content based on keywords in the query
    let foundText = "";

    $("section").each((i, elem) => {
      if ($(elem).text().toLowerCase().includes(query.toLowerCase)) {
        foundText = $(elem).text().trim();
        return false; // Stop iteration once we find the match
      }
    });

    return foundText
      ? { message: foundText }
      : { message: "No detailed information found." };
  } catch (error) {
    console.error("Error fetching documentation:", error);
    return { message: "Error fetching documentation." };
  }
}

// Function to handle Cross-CDP comparison
async function getComparison(query) {
  let response = "Comparison of Segment and Lytics:\n";

  try {
    // Fetch documentation for both Segment and Lytics
    const segmentData = await axios.get("https://segment.com/docs/?ref=nav");
    const lyticsData = await axios.get("https://docs.lytics.com/");

    const segment$ = cheerio.load(segmentData.data);
    const lytics$ = cheerio.load(lyticsData.data);

    // Searching for a relevant comparison term within Segment and Lytics
    const segmentContent = getRelevantContent(segment$, query);
    const lyticsContent = getRelevantContent(lytics$, query);

    response += `Segment:\n${segmentContent}\n\nLytics:\n${lyticsContent}`;

    return response;
  } catch (error) {
    return { message: "Error fetching comparison data." };
  }
}

// Helper function to extract relevant content based on the query
function getRelevantContent($, query) {
  let content = "";
  $("section").each((i, elem) => {
    if ($(elem).text().toLowerCase().includes(query.toLowerCase())) {
      content = $(elem).text().trim();
      return false; // Stop iteration once we find the match
    }
  });
  return content || "No relevant information found.";
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
