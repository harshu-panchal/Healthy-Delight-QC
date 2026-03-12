import { Request, Response } from "express";
import HeaderCategory from "../../../models/HeaderCategory";
import mongoose from "mongoose";

const FALLBACK_HEADER_CATEGORIES = [
  {
    _id: "fallback-milk",
    name: "Milk",
    iconLibrary: "Feather",
    iconName: "grocery-basket",
    slug: "milk",
    relatedCategory: undefined,
    order: 1,
    status: "Published",
  },
  {
    _id: "fallback-fresh-dairy",
    name: "Fresh Dairy Products",
    iconLibrary: "Feather",
    iconName: "vegetables",
    slug: "fresh-dairy-products",
    relatedCategory: undefined,
    order: 2,
    status: "Published",
  },
  {
    _id: "fallback-value-added",
    name: "Value Added Dairy",
    iconLibrary: "Feather",
    iconName: "bakery",
    slug: "value-added-dairy",
    relatedCategory: undefined,
    order: 3,
    status: "Published",
  },
  {
    _id: "fallback-traditional",
    name: "Traditional Dairy",
    iconLibrary: "Feather",
    iconName: "coffee-tea",
    slug: "traditional-dairy",
    relatedCategory: undefined,
    order: 4,
    status: "Published",
  },
  {
    _id: "fallback-desserts",
    name: "Dairy Desserts",
    iconLibrary: "Feather",
    iconName: "ice-cream",
    slug: "dairy-desserts",
    relatedCategory: undefined,
    order: 5,
    status: "Published",
  },
  {
    _id: "fallback-beverages",
    name: "Dairy Beverages",
    iconLibrary: "Feather",
    iconName: "fast-food",
    slug: "dairy-beverages",
    relatedCategory: undefined,
    order: 6,
    status: "Published",
  },
] as const;

// @desc    Get all header categories (Admin)
// @route   GET /api/v1/header-categories/admin
// @access  Private/Admin
export const getAdminHeaderCategories = async (
  _req: Request,
  res: Response,
) => {
  try {
    const categories = await HeaderCategory.find().sort({
      order: 1,
      createdAt: -1,
    });
    return res.json(categories);
  } catch (error) {
    return res.status(500).json({ message: "Server Error", error });
  }
};

// @desc    Get published header categories (Public)
// @route   GET /api/v1/header-categories
// @access  Public
export const getHeaderCategories = async (_req: Request, res: Response) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json(FALLBACK_HEADER_CATEGORIES);
    }

    const categories = await HeaderCategory.find({ status: "Published" }).sort({
      order: 1,
      createdAt: -1,
    });
    return res.json(categories);
  } catch (error) {
    // Fallback for dev/offline mode
    return res.json(FALLBACK_HEADER_CATEGORIES);
  }
};

// @desc    Create a header category
// @route   POST /api/v1/header-categories
// @access  Private/Admin
export const createHeaderCategory = async (req: Request, res: Response) => {
  try {
    const {
      name,
      iconLibrary,
      iconName,
      slug,
      themeKey,
      relatedCategory,
      status,
      order,
    } = req.body;

    const categoryExists = await HeaderCategory.findOne({ slug });
    if (categoryExists) {
      return res
        .status(400)
        .json({ message: "Header category already exists" });
    }

    const category = await HeaderCategory.create({
      name,
      iconLibrary,
      iconName,
      slug,
      themeKey,
      relatedCategory,
      status,
      order,
    });

    return res.status(201).json(category);
  } catch (error) {
    return res.status(500).json({ message: "Server Error", error });
  }
};

// @desc    Update a header category
// @route   PUT /api/v1/header-categories/:id
// @access  Private/Admin
// @desc    Update a header category
// @route   PUT /api/v1/header-categories/:id
// @access  Private/Admin
export const updateHeaderCategory = async (req: Request, res: Response) => {
  try {
    const {
      name,
      iconLibrary,
      iconName,
      slug,
      themeKey,
      relatedCategory,
      status,
      order,
    } = req.body;
    const category = await HeaderCategory.findById(req.params.id);

    if (category) {
      // Check if slug is being updated and if it's already taken
      if (slug && slug !== category.slug) {
        const slugExists = await HeaderCategory.findOne({ slug });
        if (slugExists) {
          return res
            .status(400)
            .json({ message: "Theme/Slug already used by another category" });
        }
      }

      category.name = name || category.name;
      category.iconLibrary = iconLibrary || category.iconLibrary;
      category.iconName = iconName || category.iconName;
      category.themeKey = themeKey || category.themeKey;
      category.slug = slug || category.slug;
      category.relatedCategory = relatedCategory; // Allow clearing it (undefined or null or empty string)
      category.status = status || category.status;
      category.order = order !== undefined ? order : category.order;

      const updatedCategory = await category.save();
      return res.json(updatedCategory);
    } else {
      return res.status(404).json({ message: "Header category not found" });
    }
  } catch (error: any) {
    console.error("Update Header Category Error:", error);
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: "Category with this slug/theme already exists" });
    }
    return res
      .status(500)
      .json({ message: "Server Error", error: error.message });
  }
};

// @desc    Delete a header category
// @route   DELETE /api/v1/header-categories/:id
// @access  Private/Admin
export const deleteHeaderCategory = async (req: Request, res: Response) => {
  try {
    const category = await HeaderCategory.findById(req.params.id);

    if (category) {
      await category.deleteOne();
      return res.json({ message: "Header category removed" });
    } else {
      return res.status(404).json({ message: "Header category not found" });
    }
  } catch (error) {
    return res.status(500).json({ message: "Server Error", error });
  }
};
