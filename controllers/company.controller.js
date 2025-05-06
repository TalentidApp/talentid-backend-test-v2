import Company from "../models/company.model.js";
import UploadImageToCloudinary from "../utils/uploadImageToCloudinary.js";

const addCompany = async (req, res) => {
  try {
    const { companyName, logo, address, website, about, contactPhone, contactEmail, rating } = req.body;
    console.log(`🚀 Adding company: ${companyName}`, req.body);

    // Check if company already exists
    const existingCompany = await Company.findOne({ companyName });
    if (existingCompany) {
      console.log(`❌ Company already exists: ${companyName}`);
      return res.status(400).json({ error: "Company with this name already exists." });
    }

    // Handle logo upload
    let logoUrl = "";
    if (logo && typeof logo === "string" && logo.startsWith("data:image")) {
      console.log("📤 Uploading logo to Cloudinary...");
      const logoBuffer = Buffer.from(logo.split(",")[1], "base64");
      const result = await UploadImageToCloudinary(logoBuffer, "company_logos");
      logoUrl = result.secure_url;
      console.log(`✅ Logo uploaded: ${logoUrl}`);
    }

    // Create new company
    const company = new Company({
      companyName,
      logo: logoUrl,
      address,
      website,
      about,
      contactPhone,
      contactEmail,
      rating,
    });

    await company.save();
    console.log(`✅ Company added: ${company._id}`);

    return res.status(201).json({
      message: "Company added successfully",
      data: company,
    });
  } catch (error) {
    console.error("❌ Error in addCompany:", {
      message: error.message,
      stack: error.stack,
    });
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
};

const getCompany = async (req, res) => {
  try {
    const { companyName } = req.params;
    console.log(`🚀 Fetching company: ${companyName}`);
    
    const company = await Company.findOne({ companyName });
    if (!company) {
      console.log(`❌ Company not found: ${companyName}`);
      return res.status(404).json({ error: "Company not found." });
    }
    
    console.log(`✅ Company found: ${company._id}`);
    return res.status(200).json({
      message: "Company fetched successfully",
      data: company,
    });
  } catch (error) {
    console.error("❌ Error in getCompany:", {
      message: error.message,
      stack: error.stack,
    });
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const updateCompany = async (req, res) => {
  try {
    const { companyName } = req.params;
    const { logo, address, website, about, contactPhone, contactEmail, rating } = req.body;
    console.log(`🚀 Processing company: ${companyName}`, req.body);

    let company = await Company.findOne({ companyName });
    let isNewCompany = false;

    if (!company) {
      console.log(`❌ Company not found, creating new: ${companyName}`);
      // Check if the provided companyName already exists (in case of case sensitivity)
      const existingCompany = await Company.findOne({ companyName: req.body.companyName });
      if (existingCompany) {
        console.log(`❌ Company already exists: ${req.body.companyName}`);
        return res.status(400).json({ error: "Company with this name already exists." });
      }
      company = new Company({
        companyName: req.body.companyName || companyName,
        logo: "",
        address: address || "",
        website: website || "",
        about: about || "",
        contactPhone: contactPhone || "",
        contactEmail: contactEmail || "",
        rating: rating || 0,
      });
      isNewCompany = true;
    }

    // Handle logo upload
    let logoUrl = company.logo;
    if (logo && typeof logo === "string" && logo.startsWith("data:image")) {
      console.log("📤 Uploading logo to Cloudinary...");
      const logoBuffer = Buffer.from(logo.split(",")[1], "base64");
      const result = await UploadImageToCloudinary(logoBuffer, "company_logos");
      logoUrl = result.secure_url;
      console.log(`✅ Logo uploaded: ${logoUrl}`);
    }

    // Update fields
    company.companyName = req.body.companyName || companyName;
    company.address = address || company.address;
    company.website = website || company.website;
    company.about = about || company.about;
    company.contactPhone = contactPhone || company.contactPhone;
    company.contactEmail = contactEmail || company.contactEmail;
    company.rating = rating !== undefined ? rating : company.rating;
    company.logo = logoUrl;

    await company.save();
    console.log(`✅ Company ${isNewCompany ? "added" : "updated"}: ${company._id}`);

    return res.status(isNewCompany ? 201 : 200).json({
      message: `Company ${isNewCompany ? "added" : "updated"} successfully`,
      data: company,
    });
  } catch (error) {
    console.error("❌ Error in updateCompany:", {
      message: error.message,
      stack: error.stack,
    });
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
};

export { addCompany, getCompany, updateCompany };