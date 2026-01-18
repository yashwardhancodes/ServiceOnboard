import React, { useState } from 'react';
import type { ChangeEvent, FormEvent} from 'react'
import { MapPin, Upload, X, Loader2, Map } from 'lucide-react';

// --- Interfaces ---
interface ServiceFormData {
  centerName: string;
  phone: string;
  email: string;
  city: string; // Added City
  state: string;
  zipCode: string;
  country: string;
  latitude: string;
  longitude: string;
  categories: string[];
  images: File[];
}

interface FormErrors {
  centerName?: string;
  phone?: string;
  email?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  location?: string;
  categories?: string;
  images?: string;
}

const CATEGORY_OPTIONS = ['Mechanic', 'AC', 'Electrician'];

const ServiceOnboardForm: React.FC = () => {
  // --- State ---
  const [formData, setFormData] = useState<ServiceFormData>({
    centerName: '',
    phone: '',
    email: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'India',
    latitude: '',
    longitude: '',
    categories: [],
    images: [],
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [previews, setPreviews] = useState<string[]>([]);
  
  // Loading states
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isFetchingAddress, setIsFetchingAddress] = useState<boolean>(false);

  // --- Validation Logic ---
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    if (!formData.centerName.trim()) newErrors.centerName = 'Service center name is required';
    
    // Phone validation (India: 10 digits)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!phoneRegex.test(formData.phone)) {
      newErrors.phone = 'Enter a valid 10-digit Indian phone number';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Enter a valid email address';
    }

    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.state.trim()) newErrors.state = 'State is required';

    // Zip Code (India: 6 digits)
    const zipRegex = /^\d{6}$/;
    if (!formData.zipCode.trim()) {
      newErrors.zipCode = 'Zip code is required';
    } else if (!zipRegex.test(formData.zipCode)) {
      newErrors.zipCode = 'Enter a valid 6-digit Zip code';
    }

    if (!formData.latitude || !formData.longitude) {
      newErrors.location = 'Please fetch your location coordinates';
    }

    if (formData.categories.length === 0) newErrors.categories = 'Select at least one category';
    if (formData.images.length === 0) newErrors.images = 'Upload at least one image';

    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) isValid = false;
    return isValid;
  };

  // --- Handlers ---

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field when user types
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleCategoryChange = (category: string) => {
    setFormData((prev) => {
      const exists = prev.categories.includes(category);
      const newCategories = exists
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category];
      return { ...prev, categories: newCategories };
    });
    if (errors.categories) setErrors(prev => ({ ...prev, categories: undefined }));
  };

  // --- Geolocation (Coords Only) ---
  const handleGetLocation = () => {
    setIsLocating(true);
    setErrors(prev => ({ ...prev, location: undefined }));

    if (!navigator.geolocation) {
      setErrors(prev => ({ ...prev, location: 'Geolocation not supported' }));
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((prev) => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        }));
        setIsLocating(false);
      },
      (error) => {
        console.error(error);
        setErrors(prev => ({ ...prev, location: 'Unable to retrieve location. Check permissions.' }));
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

// --- Reverse Geocoding (Coords -> Address) ---
const handleAutoFillAddress = async () => {
  if (!formData.latitude || !formData.longitude) {
    alert("Please fetch coordinates first.");
    return;
  }

  setIsFetchingAddress(true);

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${formData.latitude}&lon=${formData.longitude}&zoom=10&addressdetails=1&accept-language=en`,
      {
        headers: {
          "User-Agent": "YourAppName/1.0" // REQUIRED by Nominatim
        }
      }
    );

    const data = await response.json();

    if (data && data.address) {
      const addr = data.address;

      // Better priority order for Indian addresses
      const detectedCity =
        addr.city ||
        addr.state_district ||
        addr.county ||
        addr.town ||
        addr.suburb ||
        addr.village ||
        '';

      const detectedState = addr.state || '';
      const detectedZip = addr.postcode || '';

      setFormData(prev => ({
  ...prev,
  city: prev.city || detectedCity,
  state: prev.state || detectedState,
  zipCode: prev.zipCode || detectedZip,
  country: 'India'
}));

      // Clear validation errors if any
      setErrors(prev => ({
        ...prev,
        city: undefined,
        state: undefined,
        zipCode: undefined
      }));
    } else {
      alert("Could not determine address details from these coordinates.");
    }
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    alert("Failed to fetch address details. Please enter manually.");
  } finally {
    setIsFetchingAddress(false);
  }
};


  // --- Image Handling ---
  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setFormData((prev) => ({ ...prev, images: [...prev.images, ...filesArray] }));
      
      const newPreviews = filesArray.map((file) => URL.createObjectURL(file));
      setPreviews((prev) => [...prev, ...newPreviews]);
      
      if (errors.images) setErrors(prev => ({ ...prev, images: undefined }));
    }
  };

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // --- Submit ---
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      console.log('Valid Form Data:', formData);
      alert('Form submitted successfully! Check console.');
    } else {
      alert('Please fix the errors in the form.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-md overflow-hidden p-8">
        <div className="mb-8 border-b pb-4">
          <h2 className="text-2xl font-bold text-gray-900">Service Center Onboarding</h2>
          <p className="text-gray-600 mt-1">Register your service center details below.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* --- Basic Details --- */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Service Center Name</label>
              <input
                type="text"
                name="centerName"
                value={formData.centerName}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm border p-2 ${errors.centerName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-indigo-500'}`}
                placeholder="e.g. A1 Auto Repairs"
              />
              {errors.centerName && <p className="mt-1 text-xs text-red-500">{errors.centerName}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                maxLength={10}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm border p-2 ${errors.phone ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="9876543210"
              />
              {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm border p-2 ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="contact@example.com"
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
            </div>

          </div>

          <hr className="border-gray-200" />

          {/* --- Location Section --- */}
          <div>
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Location & Address</h3>
            
            {/* Lat/Long Row */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Latitude</label>
                <input
                  type="text"
                  name="latitude"
                  readOnly
                  value={formData.latitude}
                  className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 text-gray-500 shadow-sm sm:text-sm border p-2"
                  placeholder="Click button below"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Longitude</label>
                <input
                  type="text"
                  name="longitude"
                  readOnly
                  value={formData.longitude}
                  className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 text-gray-500 shadow-sm sm:text-sm border p-2"
                  placeholder="Click button below"
                />
              </div>
            </div>
            
            {errors.location && <p className="text-sm text-red-500 mb-2">{errors.location}</p>}

            <div className="flex flex-col sm:flex-row gap-3">
              {/* Get Coordinates Button */}
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={isLocating}
                className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:bg-indigo-400"
              >
                {isLocating ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <MapPin className="mr-2 h-4 w-4" />}
                {isLocating ? 'Fetching...' : 'Use My Location'}
              </button>

              {/* User Choice: Auto-Fill Address Button (Only shows if Coords exist) */}
              {formData.latitude && formData.longitude && (
                 <button
                 type="button"
                 onClick={handleAutoFillAddress}
                 disabled={isFetchingAddress}
                 className="inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
               >
                 {isFetchingAddress ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Map className="mr-2 h-4 w-4" />}
                 Auto-fill Address from Coordinates
               </button>
              )}
            </div>

            {/* Address Fields */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-6 mt-6">
              
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm border p-2 ${errors.city ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.city && <p className="mt-1 text-xs text-red-500">{errors.city}</p>}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">State</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm border p-2 ${errors.state ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.state && <p className="mt-1 text-xs text-red-500">{errors.state}</p>}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Zip Code</label>
                <input
                  type="text"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleChange}
                  maxLength={6}
                  className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm border p-2 ${errors.zipCode ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.zipCode && <p className="mt-1 text-xs text-red-500">{errors.zipCode}</p>}
              </div>

              <div className="sm:col-span-6">
                <label className="block text-sm font-medium text-gray-700">Country</label>
                <input
                  type="text"
                  value="India"
                  readOnly
                  className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 text-gray-500 shadow-sm sm:text-sm border p-2 cursor-not-allowed"
                />
              </div>

            </div>
          </div>

          <hr className="border-gray-200" />

          {/* --- Categories --- */}
          <div>
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-2">Service Categories</h3>
            {errors.categories && <p className="text-sm text-red-500 mb-2">{errors.categories}</p>}
            <div className="flex flex-wrap gap-4">
              {CATEGORY_OPTIONS.map((cat) => (
                <div key={cat} className="flex items-center">
                  <input
                    id={`cat-${cat}`}
                    type="checkbox"
                    checked={formData.categories.includes(cat)}
                    onChange={() => handleCategoryChange(cat)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor={`cat-${cat}`} className="ml-2 text-sm text-gray-700 select-none cursor-pointer">
                    {cat}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* --- Images --- */}
          <div>
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-2">Service Center Images</h3>
            {errors.images && <p className="text-sm text-red-500 mb-2">{errors.images}</p>}
            
            <div className="mt-2 flex justify-center rounded-md border-2 border-dashed border-gray-300 px-6 pt-5 pb-6 hover:bg-gray-50 transition">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600 justify-center">
                  <label htmlFor="images-upload" className="relative cursor-pointer rounded-md bg-white font-medium text-indigo-600 hover:text-indigo-500">
                    <span>Upload files</span>
                    <input id="images-upload" name="images" type="file" multiple accept="image/*" className="sr-only" onChange={handleImageChange} />
                  </label>
                </div>
                <p className="text-xs text-gray-500">PNG, JPG up to 10MB</p>
              </div>
            </div>

            {previews.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {previews.map((src, index) => (
                  <div key={index} className="relative group">
                    <img src={src} alt="preview" className="h-24 w-full object-cover rounded-lg shadow-sm" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* --- Submit --- */}
          <div className="pt-4">
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Submit Onboarding Form
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ServiceOnboardForm;