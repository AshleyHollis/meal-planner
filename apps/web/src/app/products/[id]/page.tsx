"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

import type { Product } from "@/types";
import {
  getProduct,
  deleteProduct,
  ApiError,
} from "@/services/api";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ProductMappingForm } from "@/components/ProductMappingForm";
import { getMealImageUrl } from "@/lib/meal-images";

interface ProductDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function fetchProduct() {
      try {
        setError(null);
        const data = await getProduct(id);
        setProduct(data);
      } catch (err) {
        if (err instanceof ApiError && err.isAuthError) {
          window.location.href = "/api/auth/login";
          return;
        }
        if (err instanceof ApiError && err.status === 404) {
          setError("Product not found.");
        } else {
          setError("Failed to load product.");
        }
      } finally {
        setLoading(false);
      }
    }
    void fetchProduct();
  }, [id]);

  const handleSaved = (updated: Product) => {
    setProduct(updated);
    setEditing(false);
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await deleteProduct(id);
      router.push("/products");
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const imageUrl = product
    ? getMealImageUrl(product.ingredient_name ?? product.product_name, 800, 400)
    : "";

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 lg:max-w-4xl">
      {/* Breadcrumb + back */}
      <div className="mb-6 space-y-2">
        <Breadcrumbs
          items={[
            { label: "Products", href: "/products" },
            { label: product?.product_name ?? "Product" },
          ]}
        />
        <div>
          <Link href="/products" className="text-sm text-blue-600 hover:underline">
            &larr; Back to Products
          </Link>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {product && !editing && (
        <div className="space-y-6">
          {/* Hero image */}
          <div className="relative h-48 w-full overflow-hidden rounded-xl lg:h-64">
            <Image
              src={imageUrl}
              alt={product.product_name}
              fill
              className="object-cover"
              placeholder="empty"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            <div className="absolute bottom-4 left-4">
              <p className="text-xs font-medium text-white/80">
                {product.ingredient_name}
              </p>
              <h1 className="text-2xl font-bold text-white drop-shadow-lg">
                {product.brand} · {product.product_name}
              </h1>
            </div>
          </div>

          {/* Details card */}
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {product.brand} {product.product_name}
                </h2>
                <p className="text-sm text-gray-500">{product.ingredient_name}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
                >
                  Edit
                </button>
                {confirmDelete ? (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => void handleDelete()}
                      disabled={deleting}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      {deleting ? "Deleting…" : "Confirm Delete"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-400 hover:bg-red-50 hover:text-red-600"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>

            {/* Attributes */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {product.size_desc && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Size
                  </p>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {product.size_desc}
                  </p>
                </div>
              )}
              {product.price != null && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Price
                  </p>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    <Badge variant="success">
                      {new Intl.NumberFormat("en-AU", {
                        style: "currency",
                        currency: "AUD",
                      }).format(product.price)}
                    </Badge>
                  </p>
                </div>
              )}
              {product.shop && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Store
                  </p>
                  <p className="mt-1">
                    <Badge variant="info">{product.shop}</Badge>
                  </p>
                </div>
              )}
            </div>

            {product.notes && (
              <div className="mt-4 rounded-lg bg-gray-50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Notes
                </p>
                <p className="mt-1 text-sm text-gray-700">{product.notes}</p>
              </div>
            )}
          </div>

          {/* Ingredient info */}
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Linked Ingredient
            </h3>
            <p className="font-medium text-gray-900">{product.ingredient_name}</p>
            <p className="mt-1 text-xs text-gray-400">
              Ingredient ID: {product.ingredient_id}
            </p>
          </div>

          {/* Metadata */}
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Metadata
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-400">Added</p>
                <p className="text-gray-700">
                  {new Date(product.created_at).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Last updated</p>
                <p className="text-gray-700">
                  {new Date(product.updated_at).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {product && editing && (
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Edit Product
          </h2>
          <ProductMappingForm
            ingredientId={product.ingredient_id}
            ingredientName={product.ingredient_name}
            existingProduct={product}
            onSaved={handleSaved}
            onCancel={() => setEditing(false)}
          />
        </div>
      )}
    </main>
  );
}
