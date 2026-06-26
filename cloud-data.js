(function () {
  const config = window.TALAT_TAI_CLOUD_CONFIG || {};
  const enabled = Boolean(
    config.supabaseUrl &&
      config.supabasePublishableKey &&
      window.supabase?.createClient,
  );
  const client = enabled
    ? window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null;

  function requireCloud() {
    if (!client) throw new Error("Cloud connection is not configured.");
  }

  function productFromRow(row) {
    return {
      id: row.id,
      name: row.name || {},
      maker: row.maker || {},
      description: row.description || {},
      price: Number(row.price || 0),
      stock: Number(row.stock || 0),
      active: row.active !== false,
      category: row.category || [],
      badge: row.badge || {},
      shape: row.shape || "mug",
      background: row.background || "#e4c453",
      color: row.color || "#a62f27",
      image: row.image_url ? { dataUrl: row.image_url, name: "Product photo" } : null,
    };
  }

  function productToRow(product, imageUrl) {
    return {
      id: product.id,
      name: product.name,
      maker: product.maker,
      description: product.description || {},
      price: Number(product.price || 0),
      stock: Number(product.stock || 0),
      active: product.active !== false,
      category: product.category || [],
      badge: product.badge,
      shape: product.shape || "mug",
      background: product.background || "#e4c453",
      color: product.color || "#a62f27",
      image_url: imageUrl || null,
      updated_at: new Date().toISOString(),
    };
  }

  function dataUrlToBlob(dataUrl) {
    const [header, payload] = dataUrl.split(",");
    const mimeType = header.match(/data:(.*?);/)?.[1] || "image/jpeg";
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return new Blob([bytes], { type: mimeType });
  }

  function safeFileName(value) {
    return String(value || "image")
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  async function uploadDataUrl(bucket, path, image) {
    if (!image?.dataUrl) return null;
    if (!image.dataUrl.startsWith("data:")) return image.dataUrl;
    const blob = dataUrlToBlob(image.dataUrl);
    const { error } = await client.storage.from(bucket).upload(path, blob, {
      contentType: blob.type,
      upsert: true,
    });
    if (error) throw error;
    return path;
  }

  async function getProducts() {
    requireCloud();
    const { data, error } = await client.from("products").select("*").order("created_at");
    if (error) throw error;
    return (data || []).map(productFromRow);
  }

  async function getSettings() {
    requireCloud();
    const [{ data: settingsRow, error: settingsError }, { data: paymentRows, error: paymentError }] =
      await Promise.all([
        client.from("store_settings").select("*").eq("id", true).maybeSingle(),
        client.from("payment_methods").select("*").order("key"),
      ]);
    if (settingsError) throw settingsError;
    if (paymentError) throw paymentError;
    const paymentQr = {};
    (paymentRows || []).forEach((method) => {
      paymentQr[method.key] = {
        label: method.label,
        dataUrl: method.qr_url || "",
        name: method.qr_url ? "Payment QR" : "",
      };
    });
    return {
      currency: settingsRow?.currency || "THB",
      shippingFee: Number(settingsRow?.shipping_fee ?? 60),
      freeShippingAt: Number(settingsRow?.free_shipping_at ?? 1500),
      paymentQr,
      brand: settingsRow?.brand || null,
      social: {
        facebook: settingsRow?.social_facebook || "",
        line: settingsRow?.social_line || "",
        telegram: settingsRow?.social_telegram || "",
        viber: settingsRow?.social_viber || "",
      },
    };
  }

  // Publish the whole storefront editor (texts, logo, colours, name, social)
  // so every customer sees the same branding.
  async function saveBrand(brand) {
    requireCloud();
    const { error } = await client.from("store_settings").upsert({
      id: true,
      brand: brand || {},
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  }

  async function saveSocial(social) {
    requireCloud();
    const { error } = await client.from("store_settings").upsert({
      id: true,
      social_facebook: social?.facebook || null,
      social_line: social?.line || null,
      social_telegram: social?.telegram || null,
      social_viber: social?.viber || null,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  }

  async function createAdmin(email, password) {
    requireCloud();
    const cleanEmail = String(email || "").trim().toLowerCase();
    // Create the auth user on a throwaway client so the signed-in admin's
    // session is not replaced by the new user's session.
    if (window.supabase?.createClient) {
      const temp = window.supabase.createClient(
        config.supabaseUrl,
        config.supabasePublishableKey,
      );
      const { error: signUpError } = await temp.auth.signUp({
        email: cleanEmail,
        password,
      });
      if (signUpError && !/already|registered|exists/i.test(signUpError.message)) {
        throw signUpError;
      }
    }
    // Promote the user to admin (the RPC verifies the caller is an admin).
    const { error } = await client.rpc("promote_to_admin", { target_email: cleanEmail });
    if (error) throw error;
  }

  async function listAdmins() {
    requireCloud();
    const { data, error } = await client.rpc("list_admins");
    if (error) throw error;
    return data || [];
  }

  // Revoke another account's admin access (the RPC guards against removing
  // yourself or the final admin).
  async function removeAdmin(email) {
    requireCloud();
    const { error } = await client.rpc("revoke_admin", {
      target_email: String(email || "").trim().toLowerCase(),
    });
    if (error) throw error;
  }

  async function getSession() {
    if (!client) return null;
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    return data.session;
  }

  // Current status for a customer's own order references, so their "My Orders"
  // reflects admin approve/reject decisions.
  async function getOrdersStatus(references) {
    requireCloud();
    if (!references || !references.length) return [];
    const { data, error } = await client.rpc("get_orders_status", { p_refs: references });
    if (error) throw error;
    return data || [];
  }

  // A customer's full order history by phone number, so they see the same
  // orders (and live status) on any device.
  async function getCustomerOrders(phone) {
    requireCloud();
    if (!phone) return [];
    const { data, error } = await client.rpc("get_customer_orders", { p_phone: phone });
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  }

  // Establish a lightweight anonymous Supabase session so guest customers
  // (name + phone sign-in) can still write their orders to the cloud, letting
  // the admin see them and get notified across devices.
  async function signInAnonymous() {
    if (!client) return null;
    const { data: current } = await client.auth.getSession();
    if (current?.session) return current.session;
    const { data, error } = await client.auth.signInAnonymously();
    if (error) throw error;
    return data.session;
  }

  async function sendMagicLink(email, name) {
    requireCloud();
    const redirectTo = window.location.href.split("#")[0].split("?")[0];
    const { error } = await client.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo, data: { name } },
    });
    if (error) throw error;
  }

  async function signInAdmin(email, password) {
    requireCloud();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();
    if (profileError || profile?.role !== "admin") {
      await client.auth.signOut();
      throw new Error("This account does not have admin access.");
    }
    return data.session;
  }

  async function isAdmin() {
    const session = await getSession();
    if (!session) return false;
    const { data, error } = await client
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();
    return !error && data?.role === "admin";
  }

  async function signOut() {
    if (!client) return;
    const { error } = await client.auth.signOut();
    if (error) throw error;
  }

  async function createOrder(order) {
    requireCloud();
    const session = await getSession();
    if (!session) throw new Error("Please sign in before placing an order.");
    const extension = order.receipt?.type?.includes("png") ? "png" : "jpg";
    const receiptPath = `${session.user.id}/${order.reference}.${extension}`;
    await uploadDataUrl("receipts", receiptPath, order.receipt);
    const { data, error } = await client.rpc("create_store_order", {
      p_reference: order.reference,
      p_customer: order.customer,
      p_payment_method_key: order.paymentMethodKey,
      p_receipt_path: receiptPath,
      p_language: order.language,
      p_items: order.items.map((item) => ({ id: item.id, quantity: item.quantity })),
    });
    if (error) throw error;
    return data;
  }

  async function getOrders() {
    requireCloud();
    const { data, error } = await client
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return Promise.all(
      (data || []).map(async (order) => {
        let receipt = null;
        if (order.receipt_path) {
          const { data: signed } = await client.storage
            .from("receipts")
            .createSignedUrl(order.receipt_path, 3600);
          if (signed?.signedUrl) receipt = { dataUrl: signed.signedUrl, name: "Payment receipt" };
        }
        return {
          reference: order.reference,
          createdAt: order.created_at,
          status: order.status,
          paymentStatus: order.payment_status,
          fulfillmentStatus: order.fulfillment_status,
          paymentMethod: order.payment_method,
          paymentMethodKey: order.payment_method_key,
          receipt,
          customer: order.customer,
          items: (order.order_items || []).map((item) => ({
            id: item.product_id,
            name: item.name,
            maker: item.maker,
            price: Number(item.price),
            quantity: item.quantity,
            total: Number(item.total),
          })),
          subtotal: Number(order.subtotal),
          shipping: Number(order.shipping),
          total: Number(order.total),
          currency: order.currency,
          language: order.language,
        };
      }),
    );
  }

  async function saveProduct(product) {
    requireCloud();
    let imageUrl = product.image?.dataUrl || null;
    if (imageUrl?.startsWith("data:")) {
      const imagePath = `${product.id}/${Date.now()}-${safeFileName(product.image.name)}.jpg`;
      await uploadDataUrl("product-images", imagePath, product.image);
      imageUrl = client.storage.from("product-images").getPublicUrl(imagePath).data.publicUrl;
    }
    const { error } = await client.from("products").upsert(productToRow(product, imageUrl));
    if (error) throw error;
    return { ...product, image: imageUrl ? { dataUrl: imageUrl, name: product.image?.name } : null };
  }

  async function deleteProduct(id) {
    requireCloud();
    const { error } = await client.from("products").delete().eq("id", id);
    if (error) throw error;
  }

  async function saveSettings(settings) {
    requireCloud();
    const { error } = await client.from("store_settings").upsert({
      id: true,
      currency: settings.currency || "THB",
      shipping_fee: Number(settings.shippingFee || 0),
      free_shipping_at: Number(settings.freeShippingAt || 0),
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  }

  async function savePaymentQr(method, image) {
    requireCloud();
    const labels = { thai: "Thai QR", myanmar: "Myanmar QR", crypto: "Crypto Payment" };
    let qrUrl = image?.dataUrl || null;
    if (qrUrl?.startsWith("data:")) {
      const imagePath = `${method}/${Date.now()}-${safeFileName(image.name)}`;
      await uploadDataUrl("payment-qr", imagePath, image);
      qrUrl = client.storage.from("payment-qr").getPublicUrl(imagePath).data.publicUrl;
    }
    const { error } = await client.from("payment_methods").upsert({
      key: method,
      label: labels[method],
      qr_url: qrUrl,
      active: true,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    return { label: labels[method], dataUrl: qrUrl || "", name: image?.name || "" };
  }

  async function updateOrder(reference, changes) {
    requireCloud();
    const row = {};
    if (changes.status !== undefined) row.status = changes.status;
    if (changes.paymentStatus !== undefined) row.payment_status = changes.paymentStatus;
    if (changes.fulfillmentStatus !== undefined) row.fulfillment_status = changes.fulfillmentStatus;
    if (changes.reviewedAt !== undefined) row.reviewed_at = changes.reviewedAt;
    row.updated_at = new Date().toISOString();
    const { error } = await client.from("orders").update(row).eq("reference", reference);
    if (error) throw error;
  }

  async function reviewOrder(reference, action) {
    requireCloud();
    const { error } = await client.rpc("review_store_order", {
      p_reference: reference,
      p_action: action,
    });
    if (error) throw error;
  }

  window.TALAT_TAI_CLOUD = {
    enabled,
    client,
    getProducts,
    getSettings,
    getSession,
    signInAnonymous,
    getOrdersStatus,
    getCustomerOrders,
    sendMagicLink,
    signInAdmin,
    isAdmin,
    signOut,
    createOrder,
    getOrders,
    saveProduct,
    deleteProduct,
    saveSettings,
    saveSocial,
    saveBrand,
    savePaymentQr,
    updateOrder,
    reviewOrder,
    createAdmin,
    listAdmins,
    removeAdmin,
  };
})();
