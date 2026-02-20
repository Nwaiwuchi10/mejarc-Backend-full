# Agent Signup Frontend Integration Guide

## Overview

This guide explains how to integrate the `AgentSignupPage` component with the NestJS backend agent registration API.

## Component Props & State Management

The `AgentSignupPage` component manages the entire registration flow in 4 steps:

1. **Signup** - User account creation (already implemented in User module)
2. **Profile** - Professional profile information
3. **Bio** - Professional biography
4. **KYC** - Know Your Customer verification

## Integration Steps

### 1. After User Signup Success

When user completes the initial signup in `AgentSignupPage`, they should be automatically transitioned to the agent registration flow.

**Current Implementation:**

```typescript
const handleSignups = async () => {
  // Validation and API call
  await Api.post('/user', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  // Move to profile step
  setStep('profile');
};
```

**Updated Implementation - Add Agent Initialization:**

```typescript
const handleSignups = async () => {
  if (!firstName || !lastName || !email || !phoneNumber || !password) {
    setModal({
      type: 'error',
      message: 'Please fill in all required fields.',
    });
    return;
  }

  if (password.length < 6) {
    setModal({
      type: 'error',
      message: 'Password must be at least 6 characters.',
    });
    return;
  }

  if (password !== confirmPassword) {
    setModal({
      type: 'error',
      message: 'Passwords do not match.',
    });
    return;
  }

  setLoading(true);

  try {
    const formData = new FormData();

    formData.append(
      'dto',
      JSON.stringify({
        firstName,
        lastName,
        email,
        phoneNumber,
        password,
      }),
    );

    const userResponse = await Api.post('/user', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    // NEW: Initialize agent registration
    const userId = userResponse.data.id;
    const agentResponse = await Api.post(`/agent/initialize/${userId}`);

    // Store IDs for next steps
    setState((prevState) => ({
      ...prevState,
      userId: userId,
      agentId: agentResponse.data.id,
    }));

    // On success, move to profile step
    setStep('profile');
  } catch (e: any) {
    setModal({
      type: 'error',
      message:
        e?.response?.data?.message || 'Signup failed. Please try again later.',
    });
  } finally {
    setLoading(false);
  }
};
```

### 2. Profile Section Integration

**Update ProfileSection to Handle API Call:**

```typescript
const handleProfileSubmit = async () => {
  if (!yearsOfExperience || !preferredTitle || specialization.length === 0) {
    setModal({
      type: 'error',
      message: 'Please fill in all required fields.',
    });
    return;
  }

  setLoading(true);

  try {
    // Upload profile picture to S3 if provided
    let profilePictureUrl = profilePicture
      ? await uploadToS3(profilePicture)
      : null;

    // Call API to submit profile
    await Api.post(`/agent/${userId}/profile`, {
      yearsOfExperience: parseInt(yearsOfExperience),
      preferredTitle,
      specialization,
      portfolioLink,
      profilePicture: profilePictureUrl,
      phoneNumber,
    });

    // Move to bio step
    setStep('bio');
  } catch (e: any) {
    setModal({
      type: 'error',
      message:
        e?.response?.data?.message ||
        'Failed to submit profile. Please try again.',
    });
  } finally {
    setLoading(false);
  }
};
```

**Update ProfileSection Props:**

```typescript
function ProfileSection({
  yearsOfExperience,
  setYearsOfExperience,
  preferredTitle,
  setPreferredTitle,
  specialization,
  setSpecialization,
  phoneNumber,
  setPhoneNumber,
  portfolioLink,
  setPortfolioLink,
  profilePicture,
  setProfilePicture,
  onContinue,
  userId, // ADD THIS
  agentId, // ADD THIS
}: any) {
  // ... component code
}
```

### 3. Bio Section Integration

**Update BioSection to Handle API Call:**

```typescript
const handleBioSubmit = async () => {
  if (!bio || bio.trim().length < 10) {
    setModal({
      type: 'error',
      message: 'Bio must be at least 10 characters.',
    });
    return;
  }

  setLoading(true);

  try {
    await Api.patch(`/agent/${agentId}/bio`, {
      bio: bio.trim(),
    });

    // Move to KYC step
    setStep('kyc');
  } catch (e: any) {
    setModal({
      type: 'error',
      message:
        e?.response?.data?.message || 'Failed to submit bio. Please try again.',
    });
  } finally {
    setLoading(false);
  }
};
```

**Update BioSection Props:**

```typescript
const BioSection = ({
  bio,
  setBio,
  onSave,
  onBack,
  agentId, // ADD THIS
}: any) => {
  // ... component code
  const handleSave = async () => {
    await handleBioSubmit(agentId, bio);
    onSave();
  };
};
```

### 4. KYC Section Integration

**Update KYCSection to Handle API Call:**

```typescript
const handleKYCSubmit = async () => {
  // Validate required fields
  if (!idType || !idNumber) {
    setModal({
      type: 'error',
      message: 'ID type and number are required.',
    });
    return;
  }

  if (!bankName || !accountNumber || !accountHolderName) {
    setModal({
      type: 'error',
      message: 'Bank details are required.',
    });
    return;
  }

  setLoading(true);

  try {
    // Upload documents to S3 if provided
    let idDocUrl = idDocument ? await uploadToS3(idDocument) : null;
    let certUrl = architectCert ? await uploadToS3(architectCert) : null;

    // Call API to submit KYC
    await Api.post(`/agent/${agentId}/kyc`, {
      idType,
      idNumber,
      idDocument: idDocUrl,
      architectCert: certUrl,
      bankName,
      accountNumber,
      accountHolderName,
    });

    // Show success modal
    setModal({
      type: 'success',
      title: 'Application Submitted',
      message:
        'Your application has been submitted. You will receive an email notification once we review your documents.',
      buttonText: 'Go to Dashboard',
    });

    // Redirect after delay
    setTimeout(() => {
      router.push('/dashboard');
    }, 3000);
  } catch (e: any) {
    setModal({
      type: 'error',
      message:
        e?.response?.data?.message || 'Failed to submit KYC. Please try again.',
    });
  } finally {
    setLoading(false);
  }
};
```

**Update KYCSection Props:**

```typescript
function KYCSection({
  idType,
  setIdType,
  idNumber,
  setIdNumber,
  setIdDocument,
  setArchitectCert,
  bankName,
  setBankName,
  accountNumber,
  setAccountNumber,
  accountHolderName,
  setAccountHolderName,
  onSubmit,
  agentId, // ADD THIS
}: any) {
  // ... component code
}
```

### 5. S3 Upload Helper Function

Create a utility function for file uploads:

```typescript
// src/Utils/S3Upload.ts
import Api from '@/src/Utils/Api';

export const uploadToS3 = async (file: File): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    // Your S3 upload endpoint
    const response = await Api.post('/upload/s3', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.url; // Should return S3 URL
  } catch (error) {
    console.error('S3 Upload failed:', error);
    throw error;
  }
};
```

### 6. Updated Main Component

**Complete AgentSignupPage with API Integration:**

```typescript
"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff, ChevronDown, Check, Upload, FileText } from "lucide-react";
import { useRouter } from "next/navigation";

import img1 from "../../assests/images/agentsignup.png";
import bgimage from "../../assests/images/bgagent.png";
import Api from "@/src/Utils/Api";
import { uploadToS3 } from "@/src/Utils/S3Upload";
import CustomModal from "@/src/components/Message/Message";

// ... InputField component (unchanged)

export default function AgentSignupPage() {
  const router = useRouter();

  // ===== STATE MANAGEMENT =====
  const [step, setStep] = useState<"signup" | "profile" | "bio" | "kyc">("signup");
  const [loading, setLoading] = useState(false);

  // User & Agent IDs
  const [userId, setUserId] = useState<string>("");
  const [agentId, setAgentId] = useState<string>("");

  // ===== FORM STATE =====
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Profile State
  const [yearsOfExperience, setYearsOfExperience] = useState("");
  const [preferredTitle, setPreferredTitle] = useState("");
  const [specialization, setSpecialization] = useState<string[]>([]);
  const [portfolioLink, setPortfolioLink] = useState("");
  const [profilePicture, setProfilePicture] = useState<File | null>(null);

  // Bio State
  const [bio, setBio] = useState("");

  // KYC State
  const [idType, setIdType] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [idDocument, setIdDocument] = useState<File | null>(null);
  const [architectCert, setArchitectCert] = useState<File | null>(null);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");

  // Modal
  const [modal, setModal] = useState<any>(null);

  // ===== HANDLERS =====

  const handleSignups = async () => {
    if (!firstName || !lastName || !email || !phoneNumber || !password) {
      setModal({
        type: "error",
        message: "Please fill in all required fields.",
      });
      return;
    }

    if (password.length < 6) {
      setModal({
        type: "error",
        message: "Password must be at least 6 characters.",
      });
      return;
    }

    if (password !== confirmPassword) {
      setModal({
        type: "error",
        message: "Passwords do not match.",
      });
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append(
        "dto",
        JSON.stringify({
          firstName,
          lastName,
          email,
          phoneNumber,
          password,
        }),
      );

      const userResponse = await Api.post("/user", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const newUserId = userResponse.data.id;

      // Initialize agent registration
      const agentResponse = await Api.post(`/agent/initialize/${newUserId}`);

      setUserId(newUserId);
      setAgentId(agentResponse.data.id);
      setStep("profile");
    } catch (e: any) {
      setModal({
        type: "error",
        message:
          e?.response?.data?.message ||
          "Signup failed. Please try again later.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async () => {
    if (!yearsOfExperience || !preferredTitle || specialization.length === 0) {
      setModal({
        type: "error",
        message: "Please fill in all required fields.",
      });
      return;
    }

    setLoading(true);

    try {
      let profilePictureUrl = null;
      if (profilePicture) {
        profilePictureUrl = await uploadToS3(profilePicture);
      }

      await Api.post(`/agent/${userId}/profile`, {
        yearsOfExperience: parseInt(yearsOfExperience),
        preferredTitle,
        specialization,
        portfolioLink,
        profilePicture: profilePictureUrl,
        phoneNumber,
      });

      setStep("bio");
    } catch (e: any) {
      setModal({
        type: "error",
        message:
          e?.response?.data?.message ||
          "Failed to submit profile. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBioSubmit = async () => {
    if (!bio || bio.trim().length < 10) {
      setModal({
        type: "error",
        message: "Bio must be at least 10 characters.",
      });
      return;
    }

    setLoading(true);

    try {
      await Api.patch(`/agent/${agentId}/bio`, {
        bio: bio.trim(),
      });

      setStep("kyc");
    } catch (e: any) {
      setModal({
        type: "error",
        message:
          e?.response?.data?.message ||
          "Failed to submit bio. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKYCSubmit = async () => {
    if (!idType || !idNumber) {
      setModal({
        type: "error",
        message: "ID type and number are required.",
      });
      return;
    }

    if (!bankName || !accountNumber || !accountHolderName) {
      setModal({
        type: "error",
        message: "Bank details are required.",
      });
      return;
    }

    setLoading(true);

    try {
      let idDocUrl = null;
      let certUrl = null;

      if (idDocument) {
        idDocUrl = await uploadToS3(idDocument);
      }

      if (architectCert) {
        certUrl = await uploadToS3(architectCert);
      }

      await Api.post(`/agent/${agentId}/kyc`, {
        idType,
        idNumber,
        idDocument: idDocUrl,
        architectCert: certUrl,
        bankName,
        accountNumber,
        accountHolderName,
      });

      setModal({
        type: "success",
        title: "Application Submitted!",
        message:
          "Your registration has been submitted successfully. You will receive an email notification once we review your documents.",
        buttonText: "Go to Dashboard",
      });

      setTimeout(() => {
        router.push("/dashboard");
      }, 3000);
    } catch (e: any) {
      setModal({
        type: "error",
        message:
          e?.response?.data?.message ||
          "Failed to submit KYC. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  // ===== RENDER =====

  return (
    <>
      <div
        className="w-full min-h-screen flex items-center justify-center p-4 sm:p-8 bg-cover bg-center relative font-sans"
        style={{ backgroundImage: `url(${bgimage.src})` }}
      >
        <div
          className={`relative w-full ${
            step === "bio" ? "max-w-[800px]" : "max-w-[1050px]"
          } bg-white rounded-[40px] shadow-2xl overflow-hidden grid grid-cols-1 ${
            step === "bio" ? "" : "lg:grid-cols-[1fr_1.2fr]"
          } transition-all duration-500`}
        >
          {/* LEFT SIDE */}
          <div
            className={`w-full h-full flex flex-col justify-center px-8 sm:px-12 md:px-16 py-12 lg:py-16 overflow-y-auto ${
              step === "bio" ? "items-center" : ""
            }`}
          >
            {step === "signup" && (
              // Signup form (existing code)
            )}

            {step === "profile" && (
              <ProfileSection
                yearsOfExperience={yearsOfExperience}
                setYearsOfExperience={setYearsOfExperience}
                preferredTitle={preferredTitle}
                setPreferredTitle={setPreferredTitle}
                specialization={specialization}
                setSpecialization={setSpecialization}
                phoneNumber={phoneNumber}
                setPhoneNumber={setPhoneNumber}
                portfolioLink={portfolioLink}
                setPortfolioLink={setPortfolioLink}
                profilePicture={profilePicture}
                setProfilePicture={setProfilePicture}
                onContinue={handleProfileSubmit}
                loading={loading}
              />
            )}

            {step === "bio" && (
              <BioSection
                bio={bio}
                setBio={setBio}
                onSave={handleBioSubmit}
                onBack={() => setStep("profile")}
                loading={loading}
              />
            )}

            {step === "kyc" && (
              <KYCSection
                idType={idType}
                setIdType={setIdType}
                idNumber={idNumber}
                setIdNumber={setIdNumber}
                setIdDocument={setIdDocument}
                setArchitectCert={setArchitectCert}
                bankName={bankName}
                setBankName={setBankName}
                accountNumber={accountNumber}
                setAccountNumber={setAccountNumber}
                accountHolderName={accountHolderName}
                setAccountHolderName={setAccountHolderName}
                onSubmit={handleKYCSubmit}
                loading={loading}
              />
            )}
          </div>

          {/* RIGHT SIDE */}
          {step !== "bio" && (
            <div className="hidden lg:block w-full h-full relative p-3">
              <div className="relative w-full h-full rounded-[32px] overflow-hidden">
                <Image
                  src={img1}
                  alt="Modern House"
                  fill
                  priority
                  className="object-cover"
                />
              </div>
            </div>
          )}
        </div>

        {modal && (
          <CustomModal
            type={modal.type}
            title={modal.title}
            message={modal.message}
            buttonText={modal.buttonText}
            onClose={() => setModal(null)}
          />
        )}
      </div>
    </>
  );
}

// Sub-components with updated props...
```

## Error Handling

### Validation Errors

Handle backend validation errors properly:

```typescript
const handleSubmit = async () => {
  try {
    // API call
  } catch (error: any) {
    const message =
      error?.response?.data?.message || 'An error occurred. Please try again.';
    setModal({
      type: 'error',
      message,
    });
  }
};
```

### Network Errors

Implement retry logic:

```typescript
const retryApiCall = async (fn: () => Promise<any>, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};
```

## Registration Status Checking

Implement status checking to allow users to resume registration:

```typescript
const checkRegistrationStatus = async (userId: string) => {
  try {
    const response = await Api.get(`/agent/user/${userId}`);
    const { registrationStatus } = response.data;

    switch (registrationStatus) {
      case 'profile_pending':
        setStep('profile');
        break;
      case 'bio_pending':
        setStep('bio');
        break;
      case 'kyc_pending':
      case 'awaiting_approval':
        setStep('kyc');
        break;
      case 'approved':
        router.push('/dashboard');
        break;
      case 'rejected':
        // Show rejection message and allow resubmit
        break;
    }
  } catch (error) {
    console.error('Failed to check status');
  }
};
```

## Best Practices

1. **Always validate client-side before API calls**
2. **Handle loading states during file uploads**
3. **Provide clear error messages to users**
4. **Store userId and agentId securely (localStorage or state)**
5. **Implement proper file size validation before upload**
6. **Show progress indicators during multi-step process**
7. **Save form data locally to prevent data loss on page reload**
8. **Implement timeout handling for slow uploads**

## Configuration

### Environment Variables

Add to `.env.local`:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
NEXT_PUBLIC_S3_UPLOAD_ENDPOINT=/upload/s3
NEXT_PUBLIC_AGENT_SIGNUP_URL=/agent-signup
```

## Testing

### Test Scenarios

1. Complete full registration flow
2. Skip optional fields (portfolio, docs)
3. Upload maximum file size
4. Test with various ID types
5. Check email notifications
6. Test resuming interrupted registration
7. Test admin approval/rejection workflow
