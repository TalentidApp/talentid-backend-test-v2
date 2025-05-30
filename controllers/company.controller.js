import Company from "../models/company.model.js";
import UploadImageToCloudinary from "../utils/uploadImageToCloudinary.js";

const addCompany = async (req, res) => {
  try {
    const { companyName, logo, address, website, about, bio, contactPhone, contactEmail, rating } = req.body;

    const existingCompany = await Company.findOne({ companyName });
    if (existingCompany) {
      return res.status(400).json({ error: "Company with this name already exists." });
    }

    let logoUrl = "";
    if (logo && typeof logo === "string" && logo.startsWith("data:image")) {
      const logoBuffer = Buffer.from(logo.split(",")[1], "base64");
      const result = await UploadImageToCloudinary(logoBuffer, "company_logos");
      logoUrl = result.secure_url;
    }

    const company = new Company({
      companyName,
      logo: logoUrl,
      address,
      website,
      about,
      bio,
      contactPhone,
      contactEmail,
      rating,
    });

    await company.save();

    return res.status(201).json({
      message: "Company added successfully",
      data: company,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
};

const getCompany = async (req, res) => {
  try {
    const { companyName } = req.params;
    
    const company = await Company.findOne({ companyName });
    if (!company) {
      return res.status(404).json({ error: "Company not found." });
    }
    
    return res.status(200).json({
      message: "Company fetched successfully",
      data: company,
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const updateCompany = async (req, res) => {
  try {
    const { companyName } = req.params;
    const { logo, address, website, about, bio, contactPhone, contactEmail, rating } = req.body;

    let company = await Company.findOne({ companyName });
    let isNewCompany = false;

    if (!company) {
      const existingCompany = await Company.findOne({ companyName: req.body.companyName });
      if (existingCompany) {
        return res.status(400).json({ error: "Company with this name already exists." });
      }
      company = new Company({
        companyName: req.body.companyName || companyName,
        logo: "",
        address: address || "",
        website: website || "",
        about: about || "",
        bio: bio || "",
        contactPhone: contactPhone || "",
        contactEmail: contactEmail || "",
        rating: rating || 0,
      });
      isNewCompany = true;
    }

    let logoUrl = company.logo;
    if (logo && typeof logo === "string" && logo.startsWith("data:image")) {
      const logoBuffer = Buffer.from(logo.split(",")[1], "base64");
      const result = await UploadImageToCloudinary(logoBuffer, "company_logos");
      logoUrl = result.secure_url;
    }

    company.companyName = req.body.companyName || companyName;
    company.address = address || company.address;
    company.website = website || company.website;
    company.about = about || company.about;
    company.bio = bio || company.bio;
    company.contactPhone = contactPhone || company.contactPhone;
    company.contactEmail = contactEmail || company.contactEmail;
    company.rating = rating !== undefined ? rating : company.rating;
    company.logo = logoUrl;

    await company.save();

    return res.status(isNewCompany ? 201 : 200).json({
      message: `Company ${isNewCompany ? "added" : "updated"} successfully`,
      data: company,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
};

export { addCompany, getCompany, updateCompany };