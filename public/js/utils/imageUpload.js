// js/utils/imageUpload.js
// Reusable ImageBB image upload utility

const IMGBB_API_KEY = "0bcbcbb920e816fc9376ec5d0a9a4f6d";
const IMGBB_UPLOAD_URL = "https://api.imgbb.com/1/upload";

/**
 * Upload images to ImageBB and return their URLs
 * @param {FileList} fileList - Files to upload
 * @returns {Promise<string[]>} Array of image URLs
 * @throws {Error} If upload fails
 */
export async function uploadImages(fileList) {
  const files = Array.from(fileList);
  const urls = [];

  for (const file of files) {
    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch(`${IMGBB_UPLOAD_URL}?key=${IMGBB_API_KEY}`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error?.message || "Image upload failed");
      }
      urls.push(data.data.url);
    } catch (err) {
      throw new Error(`Failed to upload image: ${err.message}`);
    }
  }

  return urls;
}

/**
 * Upload a single image to ImageBB
 * @param {File} file - File to upload
 * @returns {Promise<string>} Image URL
 * @throws {Error} If upload fails
 */
export async function uploadImage(file) {
  const formData = new FormData();
  formData.append("image", file);

  try {
    const response = await fetch(`${IMGBB_UPLOAD_URL}?key=${IMGBB_API_KEY}`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error?.message || "Image upload failed");
    }
    return data.data.url;
  } catch (err) {
    throw new Error(`Failed to upload image: ${err.message}`);
  }
}

/**
 * Upload a PDF file to ImageBB
 * @param {File} file - PDF file to upload
 * @returns {Promise<string>} PDF URL
 * @throws {Error} If upload fails
 */
export async function uploadPDF(file) {
  const formData = new FormData();
  formData.append("image", file);

  try {
    const response = await fetch(`${IMGBB_UPLOAD_URL}?key=${IMGBB_API_KEY}`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error?.message || "PDF upload failed");
    }
    return data.data.url;
  } catch (err) {
    throw new Error(`Failed to upload PDF: ${err.message}`);
  }
}

/**
 * Upload multiple PDF files to ImageBB
 * @param {FileList} fileList - PDFs to upload
 * @returns {Promise<string[]>} Array of PDF URLs
 * @throws {Error} If upload fails
 */
export async function uploadPDFs(fileList) {
  const files = Array.from(fileList);
  const urls = [];

  for (const file of files) {
    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch(`${IMGBB_UPLOAD_URL}?key=${IMGBB_API_KEY}`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error?.message || "PDF upload failed");
      }
      urls.push(data.data.url);
    } catch (err) {
      throw new Error(`Failed to upload PDF: ${err.message}`);
    }
  }

  return urls;
}
