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
        imageUrl: "/images/logo.png",
        defaultPrice: 25.00,
        stock: 150,
        stockThreshold: 50
      },
      {
        id: "2", 
        name: "Flyers",
        imageUrl: "/images/img1.jpg",
        defaultPrice: 15.00,
        stock: 200,
        stockThreshold: 75
      },
      {
        id: "3",
        name: "Brochures",
        imageUrl: "/images/img2.jpg",
        defaultPrice: 45.00,
        stock: 85,
        stockThreshold: 30
      },
      {
        id: "4",
        name: "Posters",
        imageUrl: "/images/img3.jpg",
        defaultPrice: 35.00,
        stock: 120,
        stockThreshold: 40
      },
      {
        id: "5",
        name: "Banners",
        imageUrl: "/images/img4.jpg",
        defaultPrice: 85.00,
        stock: 45,
        stockThreshold: 20
      },
      {
        id: "6",
        name: "Letterheads",
        imageUrl: "/images/img5.jpg",
        defaultPrice: 20.00,
        stock: 75,
        stockThreshold: 25
      },
      {
        id: "7",
        name: "Envelopes",
        imageUrl: "/images/img6.jpg",
        defaultPrice: 12.00,
        stock: 300,
        stockThreshold: 100
      },
      {
        id: "8",
        name: "Stickers",
        imageUrl: "/images/img7.jpg",
        defaultPrice: 8.00,
        stock: 500,
        stockThreshold: 150
      },
      {
        id: "9",
        name: "Booklets",
        imageUrl: "/images/img8.jpg",
        defaultPrice: 65.00,
        stock: 90,
        stockThreshold: 30
      },
      {
        id: "10",
        name: "Catalogs",
        imageUrl: "/images/img9.jpg",
        defaultPrice: 95.00,
        stock: 60,
        stockThreshold: 20
      },
      {
        id: "11",
        name: "Magazines",
        imageUrl: "/images/img10.jpg",
        defaultPrice: 75.00,
        stock: 110,
        stockThreshold: 35
      },
      {
        id: "12",
        name: "Newspapers",
        imageUrl: "/images/img11.jpg",
        defaultPrice: 15.00,
        stock: 250,
        stockThreshold: 80
      },
      {
        id: "13",
        name: "Calendars",
        imageUrl: "/images/img12.jpg",
        defaultPrice: 42.00,
        stock: 180,
        stockThreshold: 60
      },
      {
        id: "14",
        name: "Menus",
        imageUrl: "/images/m1.jpg",
        defaultPrice: 28.00,
        stock: 95,
        stockThreshold: 30
      },
      {
        id: "15",
        name: "Invitation Cards",
        imageUrl: "/images/m2.jpg",
        defaultPrice: 18.00,
        stock: 220,
        stockThreshold: 70
      },
      {
        id: "16",
        name: "Wedding Cards",
        imageUrl: "/images/m3.jpg",
        defaultPrice: 22.00,
        stock: 140,
        stockThreshold: 45
      },
      {
        id: "17",
        name: "Birthday Cards",
        imageUrl: "/images/m4.jpg",
        defaultPrice: 15.00,
        stock: 280,
        stockThreshold: 90
      },
      {
        id: "18",
        name: "Greeting Cards",
        imageUrl: "/images/m5.jpg",
        defaultPrice: 12.00,
        stock: 320,
        stockThreshold: 100
      },
      {
        id: "19",
        name: "Business Forms",
        imageUrl: "/images/b1.jpg",
        defaultPrice: 30.00,
        stock: 165,
        stockThreshold: 55
      },
      {
        id: "20",
        name: "Labels",
        imageUrl: "/images/i1.jfif",
        defaultPrice: 5.00,
        stock: 450,
        stockThreshold: 150
      },
      {
        id: "21",
        name: "Packaging Boxes",
        imageUrl: "/images/Plastic Ball point.jpeg",
        defaultPrice: 40.00,
        stock: 80,
        stockThreshold: 25
      },
      {
        id: "22",
        name: "Shopping Bags",
        imageUrl: "/images/printing-illustration.png",
        defaultPrice: 25.00,
        stock: 200,
        stockThreshold: 65
      },
      {
        id: "23",
        name: "Billboards",
        imageUrl: "/images/Banner2.jpg",
        defaultPrice: 150.00,
        stock: 25,
        stockThreshold: 10
      },
      {
        id: "24",
        name: "Vehicle Wraps",
        imageUrl: "/images/Banner3.jpg",
        defaultPrice: 200.00,
        stock: 15,
        stockThreshold: 5
      },
      {
        id: "25",
        name: "Window Graphics",
        imageUrl: "/images/IMG-20250707-WA0008.jpg",
        defaultPrice: 65.00,
        stock: 70,
        stockThreshold: 20
      },
      {
        id: "26",
        name: "T-Shirts",
        imageUrl: "/images/IMG-20250707-WA0020.jpg",
        defaultPrice: 18.00,
        stock: 350,
        stockThreshold: 115
      },
      {
        id: "27",
        name: "Mugs",
        imageUrl: "/images/IMG-20250707-WA0022.jpg",
        defaultPrice: 12.00,
        stock: 180,
        stockThreshold: 60
      },
      {
        id: "28",
        name: "Keychains",
        imageUrl: "/images/IMG-20250714-WA0007.jpg",
        defaultPrice: 6.00,
        stock: 400,
        stockThreshold: 130
      },
      {
        id: "29",
        name: "Notebooks",
        imageUrl: "/images/IMG-20250714-WA0008.jpg",
        defaultPrice: 15.00,
        stock: 120,
        stockThreshold: 40
      },
      {
        id: "30",
        name: "Pens",
        imageUrl: "/images/IMG-20250714-WA0009.jpg",
        defaultPrice: 3.00,
        stock: 500,
        stockThreshold: 165
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

export function getProductById(productId: string): BaseProduct | undefined {
  // Mock data for now - replace with real API call
  const mockProducts: BaseProduct[] = [
    {
      id: "1",
      name: "Business Cards",
      imageUrl: "/images/logo.png",
      defaultPrice: 25.00,
      stock: 150,
      stockThreshold: 50
    },
    {
      id: "2", 
      name: "Flyers",
      imageUrl: "/images/img1.jpg",
      defaultPrice: 15.00,
      stock: 200,
      stockThreshold: 75
    },
    {
      id: "3",
      name: "Brochures",
      imageUrl: "/images/img2.jpg",
      defaultPrice: 45.00,
      stock: 85,
      stockThreshold: 30
    },
    {
      id: "4",
      name: "Posters",
      imageUrl: "/images/img3.jpg",
      defaultPrice: 35.00,
      stock: 120,
      stockThreshold: 40
    },
    {
      id: "5",
      name: "Banners",
      imageUrl: "/images/img4.jpg",
      defaultPrice: 85.00,
      stock: 45,
      stockThreshold: 20
    },
    {
      id: "6",
      name: "Letterheads",
      imageUrl: "/images/img5.jpg",
      defaultPrice: 20.00,
      stock: 75,
      stockThreshold: 25
    },
    {
      id: "7",
      name: "Envelopes",
      imageUrl: "/images/img6.jpg",
      defaultPrice: 12.00,
      stock: 300,
      stockThreshold: 100
    },
    {
      id: "8",
      name: "Stickers",
      imageUrl: "/images/img7.jpg",
      defaultPrice: 8.00,
      stock: 500,
      stockThreshold: 150
    },
    {
      id: "9",
      name: "Booklets",
      imageUrl: "/images/img8.jpg",
      defaultPrice: 65.00,
      stock: 90,
      stockThreshold: 30
    },
    {
      id: "10",
      name: "Catalogs",
      imageUrl: "/images/img9.jpg",
      defaultPrice: 95.00,
      stock: 60,
      stockThreshold: 20
    },
    {
      id: "11",
      name: "Magazines",
      imageUrl: "/images/img10.jpg",
      defaultPrice: 75.00,
      stock: 110,
      stockThreshold: 35
    },
    {
      id: "12",
      name: "Newspapers",
      imageUrl: "/images/img11.jpg",
      defaultPrice: 15.00,
      stock: 250,
      stockThreshold: 80
    },
    {
      id: "13",
      name: "Calendars",
      imageUrl: "/images/img12.jpg",
      defaultPrice: 42.00,
      stock: 180,
      stockThreshold: 60
    },
    {
      id: "14",
      name: "Menus",
      imageUrl: "/images/m1.jpg",
      defaultPrice: 28.00,
      stock: 95,
      stockThreshold: 30
    },
    {
      id: "15",
      name: "Invitation Cards",
      imageUrl: "/images/m2.jpg",
      defaultPrice: 18.00,
      stock: 220,
      stockThreshold: 70
    },
    {
      id: "16",
      name: "Wedding Cards",
      imageUrl: "/images/m3.jpg",
      defaultPrice: 22.00,
      stock: 140,
      stockThreshold: 45
    },
    {
      id: "17",
      name: "Birthday Cards",
      imageUrl: "/images/m4.jpg",
      defaultPrice: 15.00,
      stock: 280,
      stockThreshold: 90
    },
    {
      id: "18",
      name: "Greeting Cards",
      imageUrl: "/images/m5.jpg",
      defaultPrice: 12.00,
      stock: 320,
      stockThreshold: 100
    },
    {
      id: "19",
      name: "Business Forms",
      imageUrl: "/images/b1.jpg",
      defaultPrice: 30.00,
      stock: 165,
      stockThreshold: 55
    },
    {
      id: "20",
      name: "Labels",
      imageUrl: "/images/i1.jfif",
      defaultPrice: 5.00,
      stock: 450,
      stockThreshold: 150
    },
    {
      id: "21",
      name: "Packaging Boxes",
      imageUrl: "/images/Plastic Ball point.jpeg",
      defaultPrice: 40.00,
      stock: 80,
      stockThreshold: 25
    },
    {
      id: "22",
      name: "Shopping Bags",
      imageUrl: "/images/printing-illustration.png",
      defaultPrice: 25.00,
      stock: 200,
      stockThreshold: 65
    },
    {
      id: "23",
      name: "Billboards",
      imageUrl: "/images/Banner2.jpg",
      defaultPrice: 150.00,
      stock: 25,
      stockThreshold: 10
    },
    {
      id: "24",
      name: "Vehicle Wraps",
      imageUrl: "/images/Banner3.jpg",
      defaultPrice: 200.00,
      stock: 15,
      stockThreshold: 5
    },
    {
      id: "25",
      name: "Window Graphics",
      imageUrl: "/images/IMG-20250707-WA0008.jpg",
      defaultPrice: 65.00,
      stock: 70,
      stockThreshold: 20
    },
    {
      id: "26",
      name: "T-Shirts",
      imageUrl: "/images/IMG-20250707-WA0020.jpg",
      defaultPrice: 18.00,
      stock: 350,
      stockThreshold: 115
    },
    {
      id: "27",
      name: "Mugs",
      imageUrl: "/images/IMG-20250707-WA0022.jpg",
      defaultPrice: 12.00,
      stock: 180,
      stockThreshold: 60
    },
    {
      id: "28",
      name: "Keychains",
      imageUrl: "/images/IMG-20250714-WA0007.jpg",
      defaultPrice: 6.00,
      stock: 400,
      stockThreshold: 130
    },
    {
      id: "29",
      name: "Notebooks",
      imageUrl: "/images/IMG-20250714-WA0008.jpg",
      defaultPrice: 15.00,
      stock: 120,
      stockThreshold: 40
    },
    {
      id: "30",
      name: "Pens",
      imageUrl: "/images/IMG-20250714-WA0009.jpg",
      defaultPrice: 3.00,
      stock: 500,
      stockThreshold: 165
    }
  ];

  return mockProducts.find(product => product.id === productId);
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
            { value: "standard", label: "Standard (3.5\" x 2\")", priceDelta: 0 },
            { value: "large", label: "Large (4\" x 2.5\")", priceDelta: 5 },
            { value: "square", label: "Square (2.5\" x 2.5\")", priceDelta: 3 }
          ]
        },
        {
          key: "finish",
          label: "Finish",
          options: [
            { value: "matte", label: "Matte", priceDelta: 0 },
            { value: "glossy", label: "Glossy", priceDelta: 2 },
            { value: "satin", label: "Satin", priceDelta: 1 }
          ]
        }
      ],
      "2": [ // Flyers
        {
          key: "size",
          label: "Size",
          options: [
            { value: "a4", label: "A4 (8.27\" x 11.69\")", priceDelta: 0 },
            { value: "a5", label: "A5 (5.83\" x 8.27\")", priceDelta: -3 },
            { value: "letter", label: "Letter (8.5\" x 11\")", priceDelta: 2 }
          ]
        },
        {
          key: "paper",
          label: "Paper Type",
          options: [
            { value: "standard", label: "Standard (80gsm)", priceDelta: 0 },
            { value: "premium", label: "Premium (120gsm)", priceDelta: 5 },
            { value: "cardstock", label: "Cardstock (250gsm)", priceDelta: 8 }
          ]
        }
      ],
      "3": [ // Brochures
        {
          key: "format",
          label: "Format",
          options: [
            { value: "bi-fold", label: "Bi-fold", priceDelta: 0 },
            { value: "tri-fold", label: "Tri-fold", priceDelta: 10 },
            { value: "gate-fold", label: "Gate-fold", priceDelta: 15 }
          ]
        },
        {
          key: "size",
          label: "Size",
          options: [
            { value: "a4", label: "A4", priceDelta: 0 },
            { value: "letter", label: "Letter", priceDelta: 3 },
            { value: "custom", label: "Custom", priceDelta: 20 }
          ]
        }
      ],
      "4": [ // Posters
        {
          key: "size",
          label: "Size",
          options: [
            { value: "a3", label: "A3 (11.69\" x 16.53\")", priceDelta: 0 },
            { value: "a2", label: "A2 (16.53\" x 23.39\")", priceDelta: 25 },
            { value: "a1", label: "A1 (23.39\" x 33.11\")", priceDelta: 50 }
          ]
        },
        {
          key: "material",
          label: "Material",
          options: [
            { value: "paper", label: "Paper", priceDelta: 0 },
            { value: "vinyl", label: "Vinyl", priceDelta: 15 },
            { value: "canvas", label: "Canvas", priceDelta: 30 }
          ]
        }
      ],
      "5": [ // Banners
        {
          key: "size",
          label: "Size",
          options: [
            { value: "2x3", label: "2ft x 3ft", priceDelta: 0 },
            { value: "3x4", label: "3ft x 4ft", priceDelta: 20 },
            { value: "4x6", label: "4ft x 6ft", priceDelta: 40 }
          ]
        },
        {
          key: "material",
          label: "Material",
          options: [
            { value: "vinyl", label: "Vinyl", priceDelta: 0 },
            { value: "fabric", label: "Fabric", priceDelta: 10 },
            { value: "mesh", label: "Mesh", priceDelta: 5 }
          ]
        }
      ],
      "6": [ // Letterheads
        {
          key: "size",
          label: "Size",
          options: [
            { value: "a4", label: "A4", priceDelta: 0 },
            { value: "letter", label: "Letter", priceDelta: 2 },
            { value: "legal", label: "Legal", priceDelta: 3 }
          ]
        },
        {
          key: "paper",
          label: "Paper Quality",
          options: [
            { value: "standard", label: "Standard (80gsm)", priceDelta: 0 },
            { value: "premium", label: "Premium (100gsm)", priceDelta: 3 },
            { value: "luxury", label: "Luxury (120gsm)", priceDelta: 5 }
          ]
        }
      ],
      "7": [ // Envelopes
        {
          key: "size",
          label: "Size",
          options: [
            { value: "a4", label: "A4", priceDelta: 0 },
            { value: "a5", label: "A5", priceDelta: -1 },
            { value: "dl", label: "DL (110 x 220mm)", priceDelta: 1 }
          ]
        },
        {
          key: "style",
          label: "Style",
          options: [
            { value: "standard", label: "Standard", priceDelta: 0 },
            { value: "window", label: "Window", priceDelta: 2 },
            { value: "padded", label: "Padded", priceDelta: 4 }
          ]
        }
      ],
      "8": [ // Stickers
        {
          key: "material",
          label: "Material",
          options: [
            { value: "vinyl", label: "Vinyl", priceDelta: 0 },
            { value: "paper", label: "Paper", priceDelta: -2 },
            { value: "transparent", label: "Transparent", priceDelta: 3 }
          ]
        },
        {
          key: "finish",
          label: "Finish",
          options: [
            { value: "matte", label: "Matte", priceDelta: 0 },
            { value: "glossy", label: "Glossy", priceDelta: 1 },
            { value: "waterproof", label: "Waterproof", priceDelta: 2 }
          ]
        }
      ],
      "9": [ // Booklets
        {
          key: "pages",
          label: "Pages",
          options: [
            { value: "8", label: "8 pages", priceDelta: 0 },
            { value: "12", label: "12 pages", priceDelta: 8 },
            { value: "16", label: "16 pages", priceDelta: 12 }
          ]
        },
        {
          key: "binding",
          label: "Binding",
          options: [
            { value: "saddle", label: "Saddle Stitched", priceDelta: 0 },
            { value: "perfect", label: "Perfect Bound", priceDelta: 5 },
            { value: "spiral", label: "Spiral Bound", priceDelta: 8 }
          ]
        }
      ],
      "10": [ // Catalogs
        {
          key: "size",
          label: "Size",
          options: [
            { value: "a4", label: "A4", priceDelta: 0 },
            { value: "a5", label: "A5", priceDelta: -5 },
            { value: "letter", label: "Letter", priceDelta: 3 }
          ]
        },
        {
          key: "pages",
          label: "Pages",
          options: [
            { value: "16", label: "16 pages", priceDelta: 0 },
            { value: "24", label: "24 pages", priceDelta: 15 },
            { value: "32", label: "32 pages", priceDelta: 25 }
          ]
        }
      ],
      "14": [ // Menus
        {
          key: "size",
          label: "Size",
          options: [
            { value: "a4", label: "A4", priceDelta: 0 },
            { value: "a5", label: "A5", priceDelta: -3 },
            { value: "letter", label: "Letter", priceDelta: 2 }
          ]
        },
        {
          key: "lamination",
          label: "Lamination",
          options: [
            { value: "none", label: "None", priceDelta: 0 },
            { value: "matte", label: "Matte", priceDelta: 4 },
            { value: "glossy", label: "Glossy", priceDelta: 6 }
          ]
        }
      ],
      "15": [ // Invitation Cards
        {
          key: "size",
          label: "Size",
          options: [
            { value: "5x7", label: "5\" x 7\"", priceDelta: 0 },
            { value: "6x8", label: "6\" x 8\"", priceDelta: 8 },
            { value: "4x6", label: "4\" x 6\"", priceDelta: -2 }
          ]
        },
        {
          key: "style",
          label: "Style",
          options: [
            { value: "elegant", label: "Elegant", priceDelta: 0 },
            { value: "modern", label: "Modern", priceDelta: 3 },
            { value: "classic", label: "Classic", priceDelta: 2 }
          ]
        }
      ],
      "16": [ // Wedding Cards
        {
          key: "size",
          label: "Size",
          options: [
            { value: "5x7", label: "5\" x 7\"", priceDelta: 0 },
            { value: "6x8", label: "6\" x 8\"", priceDelta: 10 },
            { value: "custom", label: "Custom", priceDelta: 20 }
          ]
        },
        {
          key: "finish",
          label: "Finish",
          options: [
            { value: "matte", label: "Matte", priceDelta: 0 },
            { value: "glossy", label: "Glossy", priceDelta: 5 },
            { value: "foil", label: "Foil Stamped", priceDelta: 15 }
          ]
        }
      ],
      "17": [ // Birthday Cards
        {
          key: "size",
          label: "Size",
          options: [
            { value: "5x7", label: "5\" x 7\"", priceDelta: 0 },
            { value: "4x6", label: "4\" x 6\"", priceDelta: -1 },
            { value: "square", label: "Square", priceDelta: 2 }
          ]
        },
        {
          key: "theme",
          label: "Theme",
          options: [
            { value: "kids", label: "Kids", priceDelta: 0 },
            { value: "adult", label: "Adult", priceDelta: 1 },
            { value: "elegant", label: "Elegant", priceDelta: 3 }
          ]
        }
      ],
      "18": [ // Greeting Cards
        {
          key: "occasion",
          label: "Occasion",
          options: [
            { value: "birthday", label: "Birthday", priceDelta: 0 },
            { value: "anniversary", label: "Anniversary", priceDelta: 2 },
            { value: "holiday", label: "Holiday", priceDelta: 1 }
          ]
        },
        {
          key: "style",
          label: "Style",
          options: [
            { value: "funny", label: "Funny", priceDelta: 0 },
            { value: "sentimental", label: "Sentimental", priceDelta: 1 },
            { value: "formal", label: "Formal", priceDelta: 2 }
          ]
        }
      ],
      "19": [ // Business Forms
        {
          key: "type",
          label: "Type",
          options: [
            { value: "invoice", label: "Invoice", priceDelta: 0 },
            { value: "receipt", label: "Receipt", priceDelta: 1 },
            { value: "order", label: "Order Form", priceDelta: 2 }
          ]
        },
        {
          key: "color",
          label: "Color",
          options: [
            { value: "black", label: "Black & White", priceDelta: 0 },
            { value: "blue", label: "Blue", priceDelta: 3 },
            { value: "red", label: "Red", priceDelta: 3 }
          ]
        }
      ],
      "20": [ // Labels
        {
          key: "material",
          label: "Material",
          options: [
            { value: "paper", label: "Paper", priceDelta: 0 },
            { value: "vinyl", label: "Vinyl", priceDelta: 2 },
            { value: "fabric", label: "Fabric", priceDelta: 4 }
          ]
        },
        {
          key: "adhesive",
          label: "Adhesive",
          options: [
            { value: "permanent", label: "Permanent", priceDelta: 0 },
            { value: "removable", label: "Removable", priceDelta: 1 },
            { value: "repositionable", label: "Repositionable", priceDelta: 2 }
          ]
        }
      ],
      "21": [ // Packaging Boxes
        {
          key: "material",
          label: "Material",
          options: [
            { value: "cardboard", label: "Cardboard", priceDelta: 0 },
            { value: "corrugated", label: "Corrugated", priceDelta: 5 },
            { value: "kraft", label: "Kraft", priceDelta: 3 }
          ]
        },
        {
          key: "finish",
          label: "Finish",
          options: [
            { value: "uncoated", label: "Uncoated", priceDelta: 0 },
            { value: "coated", label: "Coated", priceDelta: 4 },
            { value: "laminated", label: "Laminated", priceDelta: 8 }
          ]
        }
      ],
      "22": [ // Shopping Bags
        {
          key: "material",
          label: "Material",
          options: [
            { value: "paper", label: "Paper", priceDelta: 0 },
            { value: "plastic", label: "Plastic", priceDelta: 2 },
            { value: "fabric", label: "Fabric", priceDelta: 6 }
          ]
        },
        {
          key: "size",
          label: "Size",
          options: [
            { value: "small", label: "Small", priceDelta: 0 },
            { value: "medium", label: "Medium", priceDelta: 3 },
            { value: "large", label: "Large", priceDelta: 5 }
          ]
        }
      ],
      "23": [ // Billboards
        {
          key: "size",
          label: "Size",
          options: [
            { value: "14x48", label: "14ft x 48ft", priceDelta: 0 },
            { value: "12x24", label: "12ft x 24ft", priceDelta: -100 },
            { value: "8x16", label: "8ft x 16ft", priceDelta: -200 }
          ]
        },
        {
          key: "location",
          label: "Location",
          options: [
            { value: "highway", label: "Highway", priceDelta: 0 },
            { value: "urban", label: "Urban", priceDelta: 50 },
            { value: "digital", label: "Digital", priceDelta: 200 }
          ]
        }
      ],
      "24": [ // Vehicle Wraps
        {
          key: "vehicle",
          label: "Vehicle Type",
          options: [
            { value: "car", label: "Car", priceDelta: 0 },
            { value: "van", label: "Van", priceDelta: 100 },
            { value: "truck", label: "Truck", priceDelta: 200 }
          ]
        },
        {
          key: "coverage",
          label: "Coverage",
          options: [
            { value: "partial", label: "Partial", priceDelta: 0 },
            { value: "full", label: "Full Wrap", priceDelta: 150 },
            { value: "window", label: "Window Graphics", priceDelta: 50 }
          ]
        }
      ],
      "25": [ // Window Graphics
        {
          key: "type",
          label: "Type",
          options: [
            { value: "perforated", label: "Perforated", priceDelta: 0 },
            { value: "transparent", label: "Transparent", priceDelta: 5 },
            { value: "frosted", label: "Frosted", priceDelta: 8 }
          ]
        },
        {
          key: "size",
          label: "Size",
          options: [
            { value: "small", label: "Small", priceDelta: 0 },
            { value: "medium", label: "Medium", priceDelta: 10 },
            { value: "large", label: "Large", priceDelta: 20 }
          ]
        }
      ],
      "26": [ // T-Shirts
        {
          key: "size",
          label: "Size",
          options: [
            { value: "xs", label: "XS", priceDelta: 0 },
            { value: "s", label: "S", priceDelta: 0 },
            { value: "m", label: "M", priceDelta: 0 },
            { value: "l", label: "L", priceDelta: 2 },
            { value: "xl", label: "XL", priceDelta: 3 }
          ]
        },
        {
          key: "color",
          label: "Color",
          options: [
            { value: "white", label: "White", priceDelta: 0 },
            { value: "black", label: "Black", priceDelta: 1 },
            { value: "red", label: "Red", priceDelta: 2 },
            { value: "blue", label: "Blue", priceDelta: 2 }
          ]
        }
      ],
      "27": [ // Mugs
        {
          key: "size",
          label: "Size",
          options: [
            { value: "small", label: "Small (8oz)", priceDelta: 0 },
            { value: "medium", label: "Medium (12oz)", priceDelta: 2 },
            { value: "large", label: "Large (16oz)", priceDelta: 4 }
          ]
        },
        {
          key: "type",
          label: "Type",
          options: [
            { value: "ceramic", label: "Ceramic", priceDelta: 0 },
            { value: "travel", label: "Travel Mug", priceDelta: 3 },
            { value: "magic", label: "Magic Mug", priceDelta: 5 }
          ]
        }
      ],
      "28": [ // Keychains
        {
          key: "material",
          label: "Material",
          options: [
            { value: "metal", label: "Metal", priceDelta: 0 },
            { value: "plastic", label: "Plastic", priceDelta: -1 },
            { value: "leather", label: "Leather", priceDelta: 2 }
          ]
        },
        {
          key: "shape",
          label: "Shape",
          options: [
            { value: "round", label: "Round", priceDelta: 0 },
            { value: "square", label: "Square", priceDelta: 0 },
            { value: "custom", label: "Custom Shape", priceDelta: 3 }
          ]
        }
      ],
      "29": [ // Notebooks
        {
          key: "size",
          label: "Size",
          options: [
            { value: "a5", label: "A5", priceDelta: 0 },
            { value: "a4", label: "A4", priceDelta: 3 },
            { value: "letter", label: "Letter", priceDelta: 2 }
          ]
        },
        {
          key: "pages",
          label: "Pages",
          options: [
            { value: "50", label: "50 pages", priceDelta: 0 },
            { value: "100", label: "100 pages", priceDelta: 2 },
            { value: "200", label: "200 pages", priceDelta: 4 }
          ]
        }
      ],
      "30": [ // Pens
        {
          key: "type",
          label: "Type",
          options: [
            { value: "ballpoint", label: "Ballpoint", priceDelta: 0 },
            { value: "gel", label: "Gel", priceDelta: 1 },
            { value: "fountain", label: "Fountain", priceDelta: 3 }
          ]
        },
        {
          key: "color",
          label: "Ink Color",
          options: [
            { value: "black", label: "Black", priceDelta: 0 },
            { value: "blue", label: "Blue", priceDelta: 0 },
            { value: "red", label: "Red", priceDelta: 0 }
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