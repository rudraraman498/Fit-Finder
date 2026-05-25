import logging
import os

from dotenv import load_dotenv
from mcp.server.fastmcp import FastMCP

from auth import AuthManager
from client import CommerceClient

load_dotenv()
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)

BASE_URL = os.getenv("COMMERCE_BASE_URL", "http://localhost:8080")
EMAIL = os.environ["ADMIN_EMAIL"]
PASSWORD = os.environ["ADMIN_PASSWORD"]

auth_mgr = AuthManager(BASE_URL, EMAIL, PASSWORD)
auth_mgr.login()
commerce = CommerceClient(auth_mgr)

mcp = FastMCP("fitfinder-admin")


# ── Dashboard ────────────────────────────────────────────────────────────────

@mcp.tool()
def get_dashboard_stats() -> dict:
    """Return total products, orders, users, and revenue from the FitFinder admin dashboard."""
    return commerce._get("/admin/stats")


# ── Users ─────────────────────────────────────────────────────────────────────

@mcp.tool()
def list_users(page: int = 0, size: int = 20) -> list:
    """
    List FitFinder registered users.

    Args:
        page: Zero-based page number (default 0).
        size: Number of users per page (default 20).

    Returns a list of users, each with id, email, name, and createdAt.
    """
    return commerce._get("/admin/users", params={"page": page, "size": size})


# ── Products ──────────────────────────────────────────────────────────────────

@mcp.tool()
def get_products(page: int = 0, size: int = 20, category: str = "", gender: str = "") -> dict:
    """
    List all FitFinder products with full details including variants, pricing, stock, and images.

    Args:
        page: Zero-based page number (default 0).
        size: Number of products per page (default 20).
        category: Optional filter by category (e.g. 'Apparel', 'Footwear', 'Accessories').
        gender: Optional filter by gender (e.g. "men's", "women's", "unisex").

    Returns paginated product list with id, name, brand, price, variants, stock status, and more.
    """
    params: dict = {"page": page, "size": size}
    if category:
        params["category"] = category
    if gender:
        params["gender"] = gender
    return commerce._get("/admin/products", params=params)


@mcp.tool()
def create_product(
    slug: str,
    name: str,
    brand: str,
    description: str,
    category: str,
    subcategory: str,
    base_price: float,
    primary_image_url: str,
    images: list,
    variants: list,
    material: str = "",
    fit: str = "",
    tags: list = [],
    gender: str = "unisex",
    active: bool = True,
) -> dict:
    """
    Create a new product in FitFinder.

    Args:
        slug: URL-friendly unique identifier (e.g. 'ff-my-new-shirt').
        name: Product display name.
        brand: Brand name.
        description: Full product description.
        category: Top-level category — 'Apparel', 'Footwear', or 'Accessories'.
        subcategory: Sub-category (e.g. 'Tops', 'Running Shoes', 'Hats').
        base_price: Base price in USD (e.g. 49.99).
        primary_image_url: URL of the primary image — must also appear in the images list.
        images: List of image objects. Each must have:
                  url (str), altText (str), primary (bool).
                  Exactly one image must have primary=True and its url must match primary_image_url.
        variants: List of variant objects. Each must have:
                    sku (str), colorName (str), sizeLabel (str), sizeSystem (str), stockQty (int).
                    Optional per variant: priceOverride (float), active (bool, default True).
        material: Material description (e.g. 'Recycled polyester').
        fit: Fit style (e.g. 'Regular', 'Slim', 'Oversized').
        tags: List of search/filter tags (e.g. ['running', 'lightweight']).
        gender: Target gender — "men's", "women's", or "unisex" (default).
        active: Whether the product is live on the site (default True).

    Returns the created product object with its assigned id.
    """
    body: dict = {
        "slug": slug,
        "name": name,
        "brand": brand,
        "description": description,
        "category": category,
        "subcategory": subcategory,
        "basePrice": base_price,
        "primaryImageUrl": primary_image_url,
        "images": images,
        "variants": variants,
        "gender": gender,
        "active": active,
    }
    if material:
        body["material"] = material
    if fit:
        body["fit"] = fit
    if tags:
        body["tags"] = tags
    return commerce._post("/admin/products", body)


@mcp.tool()
def update_product(
    product_id: int,
    name: str = None,
    brand: str = None,
    description: str = None,
    category: str = None,
    subcategory: str = None,
    base_price: float = None,
    material: str = None,
    fit: str = None,
    tags: list = None,
    gender: str = None,
    primary_image_url: str = None,
    active: bool = None,
) -> dict:
    """
    Update an existing FitFinder product. Only provide the fields you want to change.

    Args:
        product_id: ID of the product to update.
        name: New display name.
        brand: New brand name.
        description: New description.
        category: New top-level category.
        subcategory: New sub-category.
        base_price: New base price in USD.
        material: New material description.
        fit: New fit style.
        tags: New list of tags (replaces existing tags).
        gender: New target gender.
        primary_image_url: New primary image URL.
        active: Set to False to deactivate (hide from storefront) or True to re-activate.

    Note: Images and variants cannot be changed via this endpoint.
    Returns the updated product object.
    """
    body: dict = {}
    if name is not None:
        body["name"] = name
    if brand is not None:
        body["brand"] = brand
    if description is not None:
        body["description"] = description
    if category is not None:
        body["category"] = category
    if subcategory is not None:
        body["subcategory"] = subcategory
    if base_price is not None:
        body["basePrice"] = base_price
    if material is not None:
        body["material"] = material
    if fit is not None:
        body["fit"] = fit
    if tags is not None:
        body["tags"] = tags
    if gender is not None:
        body["gender"] = gender
    if primary_image_url is not None:
        body["primaryImageUrl"] = primary_image_url
    if active is not None:
        body["active"] = active
    return commerce._put(f"/admin/products/{product_id}", body)


@mcp.tool()
def delete_product(product_id: int) -> str:
    """
    Deactivate (soft-delete) a FitFinder product. The product is hidden from the storefront
    but not permanently removed from the database.

    Args:
        product_id: ID of the product to deactivate.

    Returns a confirmation message.
    """
    commerce._delete(f"/admin/products/{product_id}")
    return f"Product {product_id} has been deactivated."


# ── Orders ────────────────────────────────────────────────────────────────────

@mcp.tool()
def list_orders(page: int = 0, size: int = 20) -> dict:
    """
    List all FitFinder orders with customer and item details.

    Args:
        page: Zero-based page number (default 0).
        size: Number of orders per page (default 20).

    Returns paginated order list. Each order includes: id, userId, userEmail, status,
    total, shippingName, shippingAddress, shippingCity, shippingState, shippingZip,
    createdAt, items[], paymentStatus, paymentLast4.
    """
    return commerce._get("/admin/orders", params={"page": page, "size": size})


@mcp.tool()
def update_order_status(order_id: int, status: str) -> dict:
    """
    Update the fulfillment status of a FitFinder order.

    Args:
        order_id: ID of the order to update.
        status: New status. Conventional values: CONFIRMED, SHIPPED, DELIVERED, CANCELLED.

    Returns the updated order object.
    """
    return commerce._put(f"/admin/orders/{order_id}/status", {"status": status})


if __name__ == "__main__":
    mcp.run(transport="stdio")
