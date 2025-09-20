import { BaseProduct, ProductAttribute } from "@/app/types/products";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export async function searchProducts(q: string): Promise<BaseProduct[]> {
  try {
    // TODO: Wire to your real search endpoint, e.g.:
    // const res = await fetch(`${API_BASE}/api/show-product/?search=${encodeURIComponent(q)}`);
    // return (await res.json()).results.map(/* normalize to BaseProduct */);
    
    // Mock data for now - replace with real API call
    if (!q.trim()) return [];
    
    const mockProducts: BaseProduct[] = [
      {
        id: "1",
        name: "Business Cards",
        imageUrl: "/images/logo.png"
      },
      {
        id: "2", 
        name: "Flyers",
        imageUrl: "/images/img1.jpg"
      },
      {
        id: "3",
        name: "Brochures",
        imageUrl: "/images/img2.jpg"
      },
      {
        id: "4",
        name: "Posters",
        imageUrl: "/images/img3.jpg"
      },
      {
        id: "5",
        name: "Banners",
        imageUrl: "/images/img4.jpg"
      },
      {
        id: "6",
        name: "Letterheads",
        imageUrl: "/images/img5.jpg"
      },
      {
        id: "7",
        name: "Envelopes",
        imageUrl: "/images/img6.jpg"
      },
      {
        id: "8",
        name: "Stickers",
        imageUrl: "/images/img7.jpg"
      },
      {
        id: "9",
        name: "Booklets",
        imageUrl: "/images/img8.jpg"
      },
      {
        id: "10",
        name: "Catalogs",
        imageUrl: "/images/img9.jpg"
      },
      {
        id: "11",
        name: "Magazines",
        imageUrl: "/images/img10.jpg"
      },
      {
        id: "12",
        name: "Newspapers",
        imageUrl: "/images/img11.jpg"
      },
      {
        id: "13",
        name: "Calendars",
        imageUrl: "/images/img12.jpg"
      },
      {
        id: "14",
        name: "Menus",
        imageUrl: "/images/m1.jpg"
      },
      {
        id: "15",
        name: "Invitation Cards",
        imageUrl: "/images/m2.jpg"
      },
      {
        id: "16",
        name: "Wedding Cards",
        imageUrl: "/images/m3.jpg"
      },
      {
        id: "17",
        name: "Birthday Cards",
        imageUrl: "/images/m4.jpg"
      },
      {
        id: "18",
        name: "Greeting Cards",
        imageUrl: "/images/m5.jpg"
      },
      {
        id: "19",
        name: "Business Forms",
        imageUrl: "/images/b1.jpg"
      },
      {
        id: "20",
        name: "Labels",
        imageUrl: "/images/i1.jfif"
      },
      {
        id: "21",
        name: "Packaging Boxes",
        imageUrl: "/images/Plastic Ball point.jpeg"
      },
      {
        id: "22",
        name: "Shopping Bags",
        imageUrl: "/images/printing-illustration.png"
      },
      {
        id: "23",
        name: "Billboards",
        imageUrl: "/images/Banner2.jpg"
      },
      {
        id: "24",
        name: "Vehicle Wraps",
        imageUrl: "/images/Banner3.jpg"
      },
      {
        id: "25",
        name: "Window Graphics",
        imageUrl: "/images/IMG-20250707-WA0008.jpg"
      },
      {
        id: "26",
        name: "T-Shirts",
        imageUrl: "/images/IMG-20250707-WA0020.jpg"
      },
      {
        id: "27",
        name: "Mugs",
        imageUrl: "/images/IMG-20250707-WA0022.jpg"
      },
      {
        id: "28",
        name: "Keychains",
        imageUrl: "/images/IMG-20250714-WA0007.jpg"
      },
      {
        id: "29",
        name: "Notebooks",
        imageUrl: "/images/IMG-20250714-WA0008.jpg"
      },
      {
        id: "30",
        name: "Pens",
        imageUrl: "/images/IMG-20250714-WA0009.jpg"
      }
    ];

    // Simple search filter
    return mockProducts.filter(product => 
      product.name.toLowerCase().includes(q.toLowerCase())
    );
  } catch (error) {
    console.error("Error searching products:", error);
    return [];
  }
}

export async function getProductAttributes(productId: string): Promise<ProductAttribute[]> {
  try {
    // TODO: Wire to variants/details endpoints; normalize to { key, label, options }
    
    // Mock data for now - replace with real API call
    const mockAttributes: Record<string, ProductAttribute[]> = {
      "1": [ // Business Cards
        {
          key: "size",
          label: "Size",
          options: [
            { value: "standard", label: "Standard (3.5\" x 2\")" },
            { value: "large", label: "Large (4\" x 2.5\")" },
            { value: "square", label: "Square (2.5\" x 2.5\")" }
          ]
        },
        {
          key: "finish",
          label: "Finish",
          options: [
            { value: "matte", label: "Matte" },
            { value: "glossy", label: "Glossy" },
            { value: "satin", label: "Satin" }
          ]
        }
      ],
      "2": [ // Flyers
        {
          key: "size",
          label: "Size",
          options: [
            { value: "a4", label: "A4 (8.27\" x 11.69\")" },
            { value: "a5", label: "A5 (5.83\" x 8.27\")" },
            { value: "letter", label: "Letter (8.5\" x 11\")" }
          ]
        },
        {
          key: "paper",
          label: "Paper Type",
          options: [
            { value: "standard", label: "Standard (80gsm)" },
            { value: "premium", label: "Premium (120gsm)" },
            { value: "cardstock", label: "Cardstock (250gsm)" }
          ]
        }
      ],
      "3": [ // Brochures
        {
          key: "format",
          label: "Format",
          options: [
            { value: "bi-fold", label: "Bi-fold" },
            { value: "tri-fold", label: "Tri-fold" },
            { value: "gate-fold", label: "Gate-fold" }
          ]
        },
        {
          key: "size",
          label: "Size",
          options: [
            { value: "a4", label: "A4" },
            { value: "letter", label: "Letter" },
            { value: "custom", label: "Custom" }
          ]
        }
      ],
      "4": [ // Posters
        {
          key: "size",
          label: "Size",
          options: [
            { value: "a3", label: "A3 (11.69\" x 16.53\")" },
            { value: "a2", label: "A2 (16.53\" x 23.39\")" },
            { value: "a1", label: "A1 (23.39\" x 33.11\")" }
          ]
        },
        {
          key: "material",
          label: "Material",
          options: [
            { value: "paper", label: "Paper" },
            { value: "vinyl", label: "Vinyl" },
            { value: "canvas", label: "Canvas" }
          ]
        }
      ],
      "5": [ // Banners
        {
          key: "size",
          label: "Size",
          options: [
            { value: "2x3", label: "2ft x 3ft" },
            { value: "3x4", label: "3ft x 4ft" },
            { value: "4x6", label: "4ft x 6ft" }
          ]
        },
        {
          key: "material",
          label: "Material",
          options: [
            { value: "vinyl", label: "Vinyl" },
            { value: "fabric", label: "Fabric" },
            { value: "mesh", label: "Mesh" }
          ]
        }
      ],
      "6": [ // Letterheads
        {
          key: "size",
          label: "Size",
          options: [
            { value: "a4", label: "A4" },
            { value: "letter", label: "Letter" },
            { value: "legal", label: "Legal" }
          ]
        },
        {
          key: "paper",
          label: "Paper Quality",
          options: [
            { value: "standard", label: "Standard (80gsm)" },
            { value: "premium", label: "Premium (100gsm)" },
            { value: "luxury", label: "Luxury (120gsm)" }
          ]
        }
      ],
      "7": [ // Envelopes
        {
          key: "size",
          label: "Size",
          options: [
            { value: "a4", label: "A4" },
            { value: "a5", label: "A5" },
            { value: "dl", label: "DL (110 x 220mm)" }
          ]
        },
        {
          key: "style",
          label: "Style",
          options: [
            { value: "standard", label: "Standard" },
            { value: "window", label: "Window" },
            { value: "padded", label: "Padded" }
          ]
        }
      ],
      "8": [ // Stickers
        {
          key: "material",
          label: "Material",
          options: [
            { value: "vinyl", label: "Vinyl" },
            { value: "paper", label: "Paper" },
            { value: "transparent", label: "Transparent" }
          ]
        },
        {
          key: "finish",
          label: "Finish",
          options: [
            { value: "matte", label: "Matte" },
            { value: "glossy", label: "Glossy" },
            { value: "waterproof", label: "Waterproof" }
          ]
        }
      ],
      "9": [ // Booklets
        {
          key: "pages",
          label: "Pages",
          options: [
            { value: "8", label: "8 pages" },
            { value: "12", label: "12 pages" },
            { value: "16", label: "16 pages" }
          ]
        },
        {
          key: "binding",
          label: "Binding",
          options: [
            { value: "saddle", label: "Saddle Stitched" },
            { value: "perfect", label: "Perfect Bound" },
            { value: "spiral", label: "Spiral Bound" }
          ]
        }
      ],
      "10": [ // Catalogs
        {
          key: "size",
          label: "Size",
          options: [
            { value: "a4", label: "A4" },
            { value: "a5", label: "A5" },
            { value: "letter", label: "Letter" }
          ]
        },
        {
          key: "pages",
          label: "Pages",
          options: [
            { value: "16", label: "16 pages" },
            { value: "24", label: "24 pages" },
            { value: "32", label: "32 pages" }
          ]
        }
      ],
      "14": [ // Menus
        {
          key: "size",
          label: "Size",
          options: [
            { value: "a4", label: "A4" },
            { value: "a5", label: "A5" },
            { value: "letter", label: "Letter" }
          ]
        },
        {
          key: "lamination",
          label: "Lamination",
          options: [
            { value: "none", label: "None" },
            { value: "matte", label: "Matte" },
            { value: "glossy", label: "Glossy" }
          ]
        }
      ],
      "15": [ // Invitation Cards
        {
          key: "size",
          label: "Size",
          options: [
            { value: "5x7", label: "5\" x 7\"" },
            { value: "6x8", label: "6\" x 8\"" },
            { value: "4x6", label: "4\" x 6\"" }
          ]
        },
        {
          key: "style",
          label: "Style",
          options: [
            { value: "elegant", label: "Elegant" },
            { value: "modern", label: "Modern" },
            { value: "classic", label: "Classic" }
          ]
        }
      ],
      "16": [ // Wedding Cards
        {
          key: "size",
          label: "Size",
          options: [
            { value: "5x7", label: "5\" x 7\"" },
            { value: "6x8", label: "6\" x 8\"" },
            { value: "custom", label: "Custom" }
          ]
        },
        {
          key: "finish",
          label: "Finish",
          options: [
            { value: "matte", label: "Matte" },
            { value: "glossy", label: "Glossy" },
            { value: "foil", label: "Foil Stamped" }
          ]
        }
      ],
      "17": [ // Birthday Cards
        {
          key: "size",
          label: "Size",
          options: [
            { value: "5x7", label: "5\" x 7\"" },
            { value: "4x6", label: "4\" x 6\"" },
            { value: "square", label: "Square" }
          ]
        },
        {
          key: "theme",
          label: "Theme",
          options: [
            { value: "kids", label: "Kids" },
            { value: "adult", label: "Adult" },
            { value: "elegant", label: "Elegant" }
          ]
        }
      ],
      "18": [ // Greeting Cards
        {
          key: "occasion",
          label: "Occasion",
          options: [
            { value: "birthday", label: "Birthday" },
            { value: "anniversary", label: "Anniversary" },
            { value: "holiday", label: "Holiday" }
          ]
        },
        {
          key: "style",
          label: "Style",
          options: [
            { value: "funny", label: "Funny" },
            { value: "sentimental", label: "Sentimental" },
            { value: "formal", label: "Formal" }
          ]
        }
      ],
      "19": [ // Business Forms
        {
          key: "type",
          label: "Type",
          options: [
            { value: "invoice", label: "Invoice" },
            { value: "receipt", label: "Receipt" },
            { value: "order", label: "Order Form" }
          ]
        },
        {
          key: "color",
          label: "Color",
          options: [
            { value: "black", label: "Black & White" },
            { value: "blue", label: "Blue" },
            { value: "red", label: "Red" }
          ]
        }
      ],
      "20": [ // Labels
        {
          key: "material",
          label: "Material",
          options: [
            { value: "paper", label: "Paper" },
            { value: "vinyl", label: "Vinyl" },
            { value: "fabric", label: "Fabric" }
          ]
        },
        {
          key: "adhesive",
          label: "Adhesive",
          options: [
            { value: "permanent", label: "Permanent" },
            { value: "removable", label: "Removable" },
            { value: "repositionable", label: "Repositionable" }
          ]
        }
      ],
      "21": [ // Packaging Boxes
        {
          key: "material",
          label: "Material",
          options: [
            { value: "cardboard", label: "Cardboard" },
            { value: "corrugated", label: "Corrugated" },
            { value: "kraft", label: "Kraft" }
          ]
        },
        {
          key: "finish",
          label: "Finish",
          options: [
            { value: "uncoated", label: "Uncoated" },
            { value: "coated", label: "Coated" },
            { value: "laminated", label: "Laminated" }
          ]
        }
      ],
      "22": [ // Shopping Bags
        {
          key: "material",
          label: "Material",
          options: [
            { value: "paper", label: "Paper" },
            { value: "plastic", label: "Plastic" },
            { value: "fabric", label: "Fabric" }
          ]
        },
        {
          key: "size",
          label: "Size",
          options: [
            { value: "small", label: "Small" },
            { value: "medium", label: "Medium" },
            { value: "large", label: "Large" }
          ]
        }
      ],
      "23": [ // Billboards
        {
          key: "size",
          label: "Size",
          options: [
            { value: "14x48", label: "14ft x 48ft" },
            { value: "12x24", label: "12ft x 24ft" },
            { value: "8x16", label: "8ft x 16ft" }
          ]
        },
        {
          key: "location",
          label: "Location",
          options: [
            { value: "highway", label: "Highway" },
            { value: "urban", label: "Urban" },
            { value: "digital", label: "Digital" }
          ]
        }
      ],
      "24": [ // Vehicle Wraps
        {
          key: "vehicle",
          label: "Vehicle Type",
          options: [
            { value: "car", label: "Car" },
            { value: "van", label: "Van" },
            { value: "truck", label: "Truck" }
          ]
        },
        {
          key: "coverage",
          label: "Coverage",
          options: [
            { value: "partial", label: "Partial" },
            { value: "full", label: "Full Wrap" },
            { value: "window", label: "Window Graphics" }
          ]
        }
      ],
      "25": [ // Window Graphics
        {
          key: "type",
          label: "Type",
          options: [
            { value: "perforated", label: "Perforated" },
            { value: "transparent", label: "Transparent" },
            { value: "frosted", label: "Frosted" }
          ]
        },
        {
          key: "size",
          label: "Size",
          options: [
            { value: "small", label: "Small" },
            { value: "medium", label: "Medium" },
            { value: "large", label: "Large" }
          ]
        }
      ],
      "26": [ // T-Shirts
        {
          key: "size",
          label: "Size",
          options: [
            { value: "xs", label: "XS" },
            { value: "s", label: "S" },
            { value: "m", label: "M" },
            { value: "l", label: "L" },
            { value: "xl", label: "XL" }
          ]
        },
        {
          key: "color",
          label: "Color",
          options: [
            { value: "white", label: "White" },
            { value: "black", label: "Black" },
            { value: "red", label: "Red" },
            { value: "blue", label: "Blue" }
          ]
        }
      ],
      "27": [ // Mugs
        {
          key: "size",
          label: "Size",
          options: [
            { value: "small", label: "Small (8oz)" },
            { value: "medium", label: "Medium (12oz)" },
            { value: "large", label: "Large (16oz)" }
          ]
        },
        {
          key: "type",
          label: "Type",
          options: [
            { value: "ceramic", label: "Ceramic" },
            { value: "travel", label: "Travel Mug" },
            { value: "magic", label: "Magic Mug" }
          ]
        }
      ],
      "28": [ // Keychains
        {
          key: "material",
          label: "Material",
          options: [
            { value: "metal", label: "Metal" },
            { value: "plastic", label: "Plastic" },
            { value: "leather", label: "Leather" }
          ]
        },
        {
          key: "shape",
          label: "Shape",
          options: [
            { value: "round", label: "Round" },
            { value: "square", label: "Square" },
            { value: "custom", label: "Custom Shape" }
          ]
        }
      ],
      "29": [ // Notebooks
        {
          key: "size",
          label: "Size",
          options: [
            { value: "a5", label: "A5" },
            { value: "a4", label: "A4" },
            { value: "letter", label: "Letter" }
          ]
        },
        {
          key: "pages",
          label: "Pages",
          options: [
            { value: "50", label: "50 pages" },
            { value: "100", label: "100 pages" },
            { value: "200", label: "200 pages" }
          ]
        }
      ],
      "30": [ // Pens
        {
          key: "type",
          label: "Type",
          options: [
            { value: "ballpoint", label: "Ballpoint" },
            { value: "gel", label: "Gel" },
            { value: "fountain", label: "Fountain" }
          ]
        },
        {
          key: "color",
          label: "Ink Color",
          options: [
            { value: "black", label: "Black" },
            { value: "blue", label: "Blue" },
            { value: "red", label: "Red" }
          ]
        }
      ]
    };

    return mockAttributes[productId] || [];
  } catch (error) {
    console.error("Error fetching product attributes:", error);
    return [];
  }
}