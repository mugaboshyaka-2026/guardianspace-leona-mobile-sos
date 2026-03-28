import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuth, useSignIn, useSignUp } from '@clerk/clerk-expo';
import { colors, spacing } from '../theme';
import { AppContext } from '../../App';
import { addAOI, fetchMyAOIs, updateUserProfile } from '../lib/api';
import { resetEventCache } from '../hooks/useEvents';
import { getLocationMetadata } from '../lib/locality';
import { getProductConfig } from '../lib/products';
import { AOI_PRESETS } from '../lib/aoiPresets';
import { mergeStoredUserConfig } from '../lib/userConfigStore';

const leonaAvatar = require('../assets/leona-avatar.png');
const leonaBadge = require('../assets/leona-badge.png');

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const WELCOME_LOGO_SIZE = Math.min(SCREEN_HEIGHT * 0.48, 280);
const AUTH_KEYBOARD_BEHAVIOR = Platform.OS === 'ios' ? 'padding' : undefined;

const FIXED_PRODUCT_ID = 'leona_sos';
const AUSTRALIA_PRESET = AOI_PRESETS.find((preset) => preset.name === 'Australia') || AOI_PRESETS[0];
const AUSTRALIA_DEFAULT_AOI = {
  name: AUSTRALIA_PRESET?.name || 'Australia',
  city: 'Australia',
  country_code: 'AU',
  lat: AUSTRALIA_PRESET?.lat ?? -25.2744,
  lng: AUSTRALIA_PRESET?.lng ?? 133.7751,
};

const EVENT_TYPE_OPTIONS = [
  { key: 'wildfire', label: 'Wildfires' },
  { key: 'flood', label: 'Floods' },
  { key: 'earthquake', label: 'Earthquakes' },
  { key: 'hurricane', label: 'Storms & Cyclones' },
  { key: 'conflict', label: 'Conflict' },
  { key: 'drought', label: 'Drought & Heat' },
  { key: 'volcano', label: 'Volcanoes' },
  { key: 'health', label: 'Health' },
];

export default function OnboardingScreen() {
  const { handleOnboardingComplete } = useContext(AppContext);
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const { isLoaded: signInLoaded, signIn, setActive } = useSignIn();
  const { isLoaded: signUpLoaded, signUp } = useSignUp();

  const [step, setStep] = useState(0);
  const [authMode, setAuthMode] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [fullName, setFullName] = useState('');
  const [organization, setOrganization] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationMode, setVerificationMode] = useState(null);
  const [secondFactorStrategy, setSecondFactorStrategy] = useState(null);
  const [submittingAuth, setSubmittingAuth] = useState(false);
  const selectedProduct = FIXED_PRODUCT_ID;
  const [location, setLocation] = useState(AUSTRALIA_DEFAULT_AOI.name);
  const [locationLat, setLocationLat] = useState(String(AUSTRALIA_DEFAULT_AOI.lat));
  const [locationLng, setLocationLng] = useState(String(AUSTRALIA_DEFAULT_AOI.lng));
  const [selectedAois, setSelectedAois] = useState([AUSTRALIA_DEFAULT_AOI]);
  const [existingAois, setExistingAois] = useState([]);
  const [loadingExistingAois, setLoadingExistingAois] = useState(false);
  const [selectedRadius, setSelectedRadius] = useState(50);
  const [selectedEventTypes, setSelectedEventTypes] = useState(['flood', 'wildfire', 'earthquake']);
  const [pulseAnim] = useState(new Animated.Value(1));
  const [submittingSetup, setSubmittingSetup] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [eventTypeError, setEventTypeError] = useState('');

  useEffect(() => {
    if (step === 5) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [pulseAnim, step]);

  useEffect(() => {
    if (authLoaded && isSignedIn && step === 4) {
      setStep(2);
    }
  }, [authLoaded, isSignedIn, step]);

  useEffect(() => {
    if (authLoaded && isSignedIn && step === 0) {
      setAuthMode('signin');
      setStep(2);
    }
  }, [authLoaded, isSignedIn, step]);

  useEffect(() => {
    if (!authLoaded || !isSignedIn) {
      setExistingAois([]);
      return;
    }

    let cancelled = false;
    const loadExistingAois = async () => {
      setLoadingExistingAois(true);
      try {
        const data = await fetchMyAOIs();
        if (cancelled) return;
        const aois = (data.aois || []).map((aoi) => aoi.name || aoi.location_name || aoi.location || '').filter(Boolean);
        setExistingAois(aois);
      } catch {
        if (!cancelled) {
          setExistingAois([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingExistingAois(false);
        }
      }
    };

    loadExistingAois();
    return () => {
      cancelled = true;
    };
  }, [authLoaded, isSignedIn]);

  const productConfig = getProductConfig(selectedProduct);
  const productLabel = productConfig.label;
  const selectedAoiNames = useMemo(
    () => selectedAois.map((item) => item.name).filter(Boolean),
    [selectedAois]
  );
  const allSuggestedAois = useMemo(() => existingAois, [existingAois]);

  const normalizeAoiInput = useCallback((value) => value.trim(), []);
  const parseCoordinate = useCallback((value) => {
    const normalized = String(value ?? '').trim();
    if (!normalized) {
      return null;
    }
    const next = Number(normalized);
    return Number.isFinite(next) ? next : null;
  }, []);
  const hasValidCoordinates = useCallback((lat, lng) => (
    lat !== null
    && lng !== null
    && lat >= -90
    && lat <= 90
    && lng >= -180
    && lng <= 180
  ), []);
  const buildDraftAoi = useCallback(() => {
    const normalized = normalizeAoiInput(location);
    const lat = parseCoordinate(locationLat);
    const lng = parseCoordinate(locationLng);

    if (!normalized || !hasValidCoordinates(lat, lng)) {
      return null;
    }

    const metadata = getLocationMetadata(normalized);
    return {
      name: normalized,
      city: metadata.city || normalized,
      country_code: metadata.country_code || '',
      lat,
      lng,
    };
  }, [hasValidCoordinates, location, locationLat, locationLng, normalizeAoiInput, parseCoordinate]);

  const getLocationValidationMessage = useCallback((value, latValue, lngValue) => {
    const normalized = normalizeAoiInput(value);
    const lat = parseCoordinate(latValue);
    const lng = parseCoordinate(lngValue);
    if (!normalized) {
      return 'Enter an AOI name before continuing.';
    }
    if (lat === null || lng === null) {
      return 'Enter latitude and longitude values for this AOI.';
    }
    if (!hasValidCoordinates(lat, lng)) {
      return 'Latitude must be between -90 and 90, and longitude must be between -180 and 180.';
    }
    return '';
  }, [hasValidCoordinates, normalizeAoiInput, parseCoordinate]);

  const showClerkError = (error, fallbackMessage) => {
    const firstError = error?.errors?.[0];
    const message = firstError?.longMessage || firstError?.message || fallbackMessage;
    Alert.alert('Authentication error', message);
  };

  const showAuthorizedPartyHelp = (status, clientTrustState) => {
    const statusLine = status ? `Status: ${status}.` : '';
    const trustLine = clientTrustState ? `Client trust state: ${clientTrustState}.` : '';
    Alert.alert(
      'Clerk configuration required',
      `This mobile app is not yet allowed as an authorized client. ${statusLine} ${trustLine} Add "leona.sos.space.guardian" to Clerk Authorized Parties, or relax the azp check for native clients, then try signing in again.`
    );
  };

  const parseName = () => {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    return {
      firstName: parts[0] || '',
      lastName: parts.slice(1).join(' '),
    };
  };

  const getPreferredSecondFactor = (factors = []) => {
    const preferredOrder = ['email_code', 'phone_code', 'totp', 'backup_code'];
    for (const strategy of preferredOrder) {
      const match = factors.find((factor) => factor?.strategy === strategy);
      if (match) return match.strategy;
    }
    return factors[0]?.strategy || null;
  };

  const getSignInFuture = () => signIn?.__internal_future;

  const getVerificationCopy = () => {
    if (verificationMode === 'client_trust_email_code') {
      return {
        title: 'Verify this device',
        subtitle: `Enter the code Clerk sent to ${email}.`,
        buttonLabel: 'VERIFY DEVICE',
      };
    }

    if (verificationMode === 'signin_second_factor') {
      const strategyLabel = secondFactorStrategy === 'email_code'
        ? `Enter the code sent to ${email}.`
        : secondFactorStrategy === 'phone_code'
          ? 'Enter the code sent to your phone.'
          : secondFactorStrategy === 'backup_code'
            ? 'Enter one of your backup codes.'
            : 'Enter your verification code to finish signing in.';
      return {
        title: 'Verify sign in',
        subtitle: strategyLabel,
        buttonLabel: 'VERIFY SIGN IN',
      };
    }

    return {
      title: 'Verify your email',
      subtitle: `Enter the code Clerk sent to ${email}.`,
      buttonLabel: 'VERIFY EMAIL',
    };
  };

  const handleSignIn = async () => {
    if (!authLoaded || !signInLoaded) {
      Alert.alert('Please wait', 'Authentication is still loading.');
      return;
    }
    if (!email.trim() || !password.trim()) {
      Alert.alert('Credentials required', 'Enter your email and password.');
      return;
    }

    setSubmittingAuth(true);
    try {
      const result = await signIn.create({
        identifier: email.trim(),
        password,
      });

      if (result.status === 'complete' && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        setStep(2);
        return;
      }

      if (result.status === 'needs_second_factor') {
        const strategy = getPreferredSecondFactor(result.supportedSecondFactors || []);
        if (!strategy) {
          Alert.alert('Verification required', 'Your account requires a second factor, but no supported method was returned.');
          return;
        }

        if (strategy === 'email_code' || strategy === 'phone_code') {
          await result.prepareSecondFactor({ strategy });
        }

        setSecondFactorStrategy(strategy);
        setVerificationMode('signin_second_factor');
        setVerificationCode('');
        setStep(4);
        return;
      }

      if (result.status === 'needs_client_trust') {
        const signInFuture = getSignInFuture();
        if (!signInFuture?.sendEmailCode) {
          showAuthorizedPartyHelp(result.status, result.clientTrustState);
          return;
        }

        const sendResult = await signInFuture.sendEmailCode();
        if (sendResult?.error) {
          showClerkError(sendResult.error, 'Unable to send the device verification code.');
          return;
        }

        setVerificationMode('client_trust_email_code');
        setVerificationCode('');
        setStep(4);
        return;
      }

      if (result.status === 'needs_new_password') {
        Alert.alert('Password update required', 'This account must set a new password before sign-in can complete.');
        return;
      }

      Alert.alert('Sign-in not completed', `Clerk returned status "${result.status}".`);
    } catch (error) {
      showClerkError(error, 'Unable to sign in.');
    } finally {
      setSubmittingAuth(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!authLoaded || !signUpLoaded) {
      Alert.alert('Please wait', 'Authentication is still loading.');
      return;
    }
    if (!fullName.trim() || !email.trim()) {
      Alert.alert('Required fields', 'Please enter your name and email.');
      return;
    }
    if (!password.trim()) {
      Alert.alert('Password required', 'Please create a password.');
      return;
    }

    const { firstName, lastName } = parseName();
    setSubmittingAuth(true);
    try {
      const result = await signUp.create({
        emailAddress: email.trim(),
        password,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
      });

      if (result.status === 'complete' && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        setStep(2);
        return;
      }

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setVerificationMode('signup');
      setVerificationCode('');
      setStep(4);
    } catch (error) {
      showClerkError(error, 'Unable to create account.');
    } finally {
      setSubmittingAuth(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (verificationMode === 'client_trust_email_code') {
      const signInFuture = getSignInFuture();
      if (!signInFuture?.verifyEmailCode || !signInFuture?.finalize) {
        Alert.alert('Verification unavailable', 'This Clerk SDK does not expose the client-trust verification flow.');
        return;
      }
      if (!verificationCode.trim()) {
        Alert.alert('Verification code required', 'Enter the code sent to your email.');
        return;
      }

      setSubmittingAuth(true);
      try {
        const verifyResult = await signInFuture.verifyEmailCode({ code: verificationCode.trim() });
        if (verifyResult?.error) {
          showClerkError(verifyResult.error, 'Unable to verify this device.');
          return;
        }

        const finalizeResult = await signInFuture.finalize();
        if (finalizeResult?.error) {
          showClerkError(finalizeResult.error, 'Unable to finalize sign-in for this device.');
          return;
        }

        const finalizedSessionId = signInFuture.createdSessionId || signIn?.createdSessionId;
        if (!finalizedSessionId) {
          Alert.alert('Verification incomplete', 'Clerk did not return a session after device verification.');
          return;
        }

        await setActive({ session: finalizedSessionId });
        setVerificationMode(null);
        setVerificationCode('');
        setStep(2);
      } catch (error) {
        showClerkError(error, 'Unable to verify this device.');
      } finally {
        setSubmittingAuth(false);
      }
      return;
    }

    if (verificationMode === 'signin_second_factor') {
      if (!signInLoaded || !secondFactorStrategy) {
        Alert.alert('Please wait', 'Authentication is still loading.');
        return;
      }
      if (!verificationCode.trim()) {
        Alert.alert('Verification code required', 'Enter your verification code.');
        return;
      }

      setSubmittingAuth(true);
      try {
        const result = await signIn.attemptSecondFactor({
          strategy: secondFactorStrategy,
          code: verificationCode.trim(),
        });

        if (result.status !== 'complete' || !result.createdSessionId) {
          Alert.alert('Verification incomplete', `Clerk returned status "${result.status}".`);
          return;
        }

        await setActive({ session: result.createdSessionId });
        setVerificationMode(null);
        setSecondFactorStrategy(null);
        setVerificationCode('');
        setStep(2);
      } catch (error) {
        showClerkError(error, 'Unable to verify sign-in.');
      } finally {
        setSubmittingAuth(false);
      }
      return;
    }

    if (!signUpLoaded) {
      Alert.alert('Please wait', 'Authentication is still loading.');
      return;
    }
    if (!verificationCode.trim()) {
      Alert.alert('Verification code required', 'Enter the code sent to your email.');
      return;
    }

    setSubmittingAuth(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode.trim(),
      });

      if (result.status !== 'complete' || !result.createdSessionId) {
        Alert.alert('Verification incomplete', 'The account is not ready yet. Check the code and try again.');
        return;
      }

      await setActive({ session: result.createdSessionId });
      setVerificationMode(null);
      setStep(2);
    } catch (error) {
      showClerkError(error, 'Unable to verify email.');
    } finally {
      setSubmittingAuth(false);
    }
  };

  const handleGuestContinue = () => {
    setAuthMode('guest');
    setEmail('');
    setFullName('Guest User');
    setStep(2);
  };

  const toggleAoi = () => {
    const draftAoi = buildDraftAoi();
    if (!draftAoi) {
      setLocationError('Enter an AOI name plus latitude and longitude before adding it.');
      return false;
    }

    setLocationError('');

    setSelectedAois((prev) => (
      prev.some((item) => item.name === draftAoi.name)
        ? prev
        : [...prev, draftAoi]
    ));
    setLocation('');
    setLocationLat('');
    setLocationLng('');
    return true;
  };

  const applyPresetAoi = useCallback((preset) => {
    setLocation(preset.name);
    setLocationLat(String(preset.lat));
    setLocationLng(String(preset.lng));
    setLocationError('');
  }, []);

  const toggleEventType = (value) => {
    setEventTypeError('');
    setSelectedEventTypes((prev) => (
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value]
    ));
  };

  const createAoiWithFallback = async (aoi, isPrimary = false) => {
    const payload = {
      name: aoi.name,
      city: aoi.city,
      country_code: aoi.country_code,
      lat: aoi.lat,
      lng: aoi.lng,
      radius_km: selectedRadius,
      is_primary: isPrimary,
    };

    console.log('[AOI_SETUP] Attempting AOI create', {
      aoiName: aoi.name,
      payload,
    });
    await addAOI(payload);
    console.log('[AOI_SETUP] AOI create succeeded', {
      aoiName: aoi.name,
      payload,
    });
  };

  const handleLocationNext = () => {
    const normalizedLocation = normalizeAoiInput(location);
    const locationMessage = normalizedLocation ? getLocationValidationMessage(normalizedLocation, locationLat, locationLng) : '';
    const draftAoi = normalizedLocation && !locationMessage ? buildDraftAoi() : null;

    if (normalizedLocation && locationMessage) {
      setLocationError(locationMessage);
      Alert.alert('Valid location required', locationMessage);
      return;
    }

    const nextAois = draftAoi
      ? selectedAois.some((item) => item.name === draftAoi.name)
        ? selectedAois
        : [...selectedAois, draftAoi]
      : selectedAois;

    if (nextAois.length === 0 && existingAois.length === 0) {
      setLocationError('Add at least one AOI with coordinates before continuing.');
      Alert.alert('AOI required', 'Select at least one area of interest before continuing.');
      return;
    }

    if (selectedEventTypes.length === 0) {
      setEventTypeError('Select at least one event type before continuing.');
      Alert.alert('Event types required', 'Select at least one event type before continuing.');
      return;
    }

    setLocationError('');
    setEventTypeError('');
    setSelectedAois(nextAois);
    setStep(5);
  };

  const handleComplete = async () => {
    const normalizedAois = Array.from(new Set(
      [...existingAois, ...selectedAois.map((item) => normalizeAoiInput(item.name))]
        .filter(Boolean)
    ));

    if (normalizedAois.length === 0) {
      Alert.alert('AOI required', 'Select at least one area of interest before entering the app.');
      return;
    }

    if (selectedEventTypes.length === 0) {
      setEventTypeError('Select at least one event type before entering the app.');
      Alert.alert('Event types required', 'Select at least one event type before entering the app.');
      return;
    }

    if (isSignedIn) {
      const existingAoiSet = new Set(existingAois.map((item) => item.toLowerCase()));
      const aoisToCreate = selectedAois.filter((item) => !existingAoiSet.has(item.name.toLowerCase()));

      setSubmittingSetup(true);
      try {
        if (aoisToCreate.length > 0) {
          console.log('[AOI_SETUP] Starting AOI setup', {
            selectedRadius,
            aoisToCreate: aoisToCreate.map((item) => item.name),
          });
          for (const [index, aoi] of aoisToCreate.entries()) {
            await createAoiWithFallback(aoi, existingAois.length === 0 && index === 0);
          }
          resetEventCache();
          setExistingAois((prev) => Array.from(new Set([...prev, ...aoisToCreate.map((item) => item.name)])));
          console.log('[AOI_SETUP] AOI setup completed', {
            aoisCreated: aoisToCreate.map((item) => item.name),
          });
        }
        await updateUserProfile({
          preferences: {
            event_types: selectedEventTypes,
            radius_km: selectedRadius,
          },
        });
        await mergeStoredUserConfig({
          authMode,
          email,
          fullName,
          organization,
          product: selectedProduct,
          location: normalizedAois[0] || location,
          aois: normalizedAois,
          radius: selectedRadius,
          eventTypes: selectedEventTypes,
        });
        console.log('[AOI_SETUP] Preferences persisted', {
          eventTypes: selectedEventTypes,
          radiusKm: selectedRadius,
          aois: normalizedAois,
        });
      } catch (error) {
        console.error('[AOI_SETUP] AOI setup aborted', {
          message: error?.message || 'Unknown error',
          status: error?.status || null,
        });
        Alert.alert('AOI setup failed', error?.message || 'Unable to save your areas of interest.');
        setSubmittingSetup(false);
        return;
      } finally {
        setSubmittingSetup(false);
      }
    }

    const onboardingConfig = {
      authMode,
      email,
      fullName,
      organization,
      product: selectedProduct,
      location: normalizedAois[0] || location,
      aois: normalizedAois,
      radius: selectedRadius,
      eventTypes: selectedEventTypes,
    };

    await mergeStoredUserConfig(onboardingConfig).catch((err) => {
      console.warn('[Onboarding] Local config persist failed:', err.message);
    });
    handleOnboardingComplete(onboardingConfig);
  };

  return (
    <View style={styles.container}>
      {step === 0 && (
        <StepWelcome
          onSignIn={() => {
            setAuthMode('signin');
            setStep(1);
          }}
          onCreateAccount={() => {
            setAuthMode('create');
            setStep(1);
          }}
          onGuest={handleGuestContinue}
        />
      )}
      {step === 1 && authMode === 'signin' && (
        <StepSignIn
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          rememberMe={rememberMe}
          setRememberMe={setRememberMe}
          onSubmit={handleSignIn}
          onBack={() => setStep(0)}
          submitting={submittingAuth}
        />
      )}
      {step === 1 && authMode === 'create' && (
        <StepCreateAccount
          fullName={fullName}
          setFullName={setFullName}
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          organization={organization}
          setOrganization={setOrganization}
          onSubmit={handleCreateAccount}
          onBack={() => setStep(0)}
          submitting={submittingAuth}
        />
      )}
      {step === 2 && (
        <StepAoiSetup
          location={location}
          setLocation={setLocation}
          locationLat={locationLat}
          setLocationLat={setLocationLat}
          locationLng={locationLng}
          setLocationLng={setLocationLng}
          locationError={locationError}
          setLocationError={setLocationError}
          eventTypeError={eventTypeError}
          selectedAois={selectedAois}
          toggleAoi={toggleAoi}
          applyPresetAoi={applyPresetAoi}
          presets={AOI_PRESETS}
          suggestions={allSuggestedAois}
          existingAois={existingAois}
          defaultAoiLabel={AUSTRALIA_DEFAULT_AOI.name}
          selectedRadius={selectedRadius}
          setSelectedRadius={setSelectedRadius}
          selectedEventTypes={selectedEventTypes}
          toggleEventType={toggleEventType}
          onNext={handleLocationNext}
          loadingExistingAois={loadingExistingAois}
        />
      )}
      {step === 4 && (
        <StepVerifyEmail
          title={getVerificationCopy().title}
          subtitle={getVerificationCopy().subtitle}
          buttonLabel={getVerificationCopy().buttonLabel}
          email={email}
          verificationCode={verificationCode}
          setVerificationCode={setVerificationCode}
          onSubmit={handleVerifyEmail}
          onBack={() => {
            setVerificationCode('');
            setVerificationMode(null);
            setSecondFactorStrategy(null);
            setStep(1);
          }}
          submitting={submittingAuth}
        />
      )}
      {step === 5 && (
        <StepReady
          location={location}
          radius={selectedRadius}
          aois={Array.from(new Set([...existingAois, ...selectedAoiNames]))}
          eventTypes={selectedEventTypes}
          product={selectedProduct}
          productLabel={productLabel}
          eventTypeError={eventTypeError}
          onComplete={handleComplete}
          pulseAnim={pulseAnim}
          submitting={submittingSetup}
        />
      )}
    </View>
  );
}

const StepWelcome = ({ onSignIn, onCreateAccount, onGuest }) => (
  <View style={styles.welcomeContainer}>
    <View style={styles.welcomeLogoArea}>
      <Image source={leonaBadge} style={styles.welcomeLogo} resizeMode="contain" />
    </View>
    <View style={styles.welcomeContent}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>LEONA</Text>
      </View>
      <Text style={styles.subtitle}>Monitor. Guide. Protect.</Text>

      <TouchableOpacity style={styles.buttonPrimary} onPress={onSignIn}>
        <Text style={styles.buttonTextPrimary}>SIGN IN</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.buttonOutline} onPress={onCreateAccount}>
        <Text style={styles.buttonTextOutline}>CREATE ACCOUNT</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onGuest}>
        <Text style={styles.linkText}>Continue as Guest -></Text>
      </TouchableOpacity>

      <View style={styles.featurePills}>
        {['21 Disaster Types', 'AI Intelligence', 'Live Data', 'Global News', 'Markets', 'Sports'].map((label) => (
          <View key={label} style={styles.pill}>
            <Text style={styles.pillText}>{label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.copyrightText}>Property of Guardian Space</Text>
    </View>
  </View>
);

const StepSignIn = ({ email, setEmail, password, setPassword, rememberMe, setRememberMe, onSubmit, onBack, submitting }) => {
  const biometricLabel = Platform.OS === 'ios' ? 'Face ID' : 'biometric authentication';

  const handleFaceID = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        Alert.alert('Biometrics unavailable', 'This device does not support biometric authentication.');
        return;
      }
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        Alert.alert('Biometrics not set up', 'Please enable biometric authentication in your device settings first.');
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Sign in to LEONA',
        fallbackLabel: 'Use Email',
        cancelLabel: 'Cancel',
      });
      if (result.success) {
        onSubmit();
      }
    } catch (error) {
      Alert.alert('Authentication error', error.message);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={AUTH_KEYBOARD_BEHAVIOR}>
      <ScrollView contentContainerStyle={styles.stepContainer}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>{'<'} Back</Text>
        </TouchableOpacity>

        <View style={styles.avatarContainer}>
          <Image source={leonaAvatar} style={styles.avatarImageSmall} />
        </View>

        <Text style={styles.stepTitle}>Welcome back</Text>
        <Text style={styles.stepSubtitle}>Sign in to your LEONA account</Text>

        <TouchableOpacity style={styles.faceIDBtn} onPress={handleFaceID} activeOpacity={0.75}>
          <Text style={styles.faceIDText}>{`Sign in with ${biometricLabel}`}</Text>
        </TouchableOpacity>

        <View style={styles.orDivider}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>or use email</Text>
          <View style={styles.orLine} />
        </View>

        <FormInput
          label="EMAIL"
          value={email}
          onChangeText={setEmail}
          placeholder="you@company.com"
          keyboardType="email-address"
        />
        <FormInput
          label="PASSWORD"
          value={password}
          onChangeText={setPassword}
          placeholder="Enter password"
          secureTextEntry
        />

        <View style={styles.rememberRow}>
          <TouchableOpacity
            style={styles.rememberToggle}
            onPress={() => setRememberMe(!rememberMe)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
              {rememberMe && <Text style={styles.checkboxTick}>✓</Text>}
            </View>
            <Text style={styles.rememberText}>Remember me</Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.buttonPrimary} onPress={onSubmit} disabled={submitting}>
          <Text style={styles.buttonTextPrimary}>{submitting ? 'SIGNING IN...' : 'SIGN IN ->'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const StepCreateAccount = ({
  fullName,
  setFullName,
  email,
  setEmail,
  password,
  setPassword,
  organization,
  setOrganization,
  onSubmit,
  onBack,
  submitting,
}) => (
  <KeyboardAvoidingView style={{ flex: 1 }} behavior={AUTH_KEYBOARD_BEHAVIOR}>
    <ScrollView contentContainerStyle={styles.stepContainer}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backText}>{'<'} Back</Text>
      </TouchableOpacity>

      <View style={styles.avatarContainer}>
        <Image source={leonaAvatar} style={styles.avatarImageSmall} />
      </View>

      <Text style={styles.stepTitle}>Create your account</Text>
      <Text style={styles.stepSubtitle}>LEONA will configure your intelligence dashboard</Text>

      <FormInput
        label="FULL NAME"
        value={fullName}
        onChangeText={setFullName}
        placeholder="John Smith"
      />
      <FormInput
        label="EMAIL"
        value={email}
        onChangeText={setEmail}
        placeholder="you@company.com"
        keyboardType="email-address"
      />
      <FormInput
        label="PASSWORD"
        value={password}
        onChangeText={setPassword}
        placeholder="Create a password"
        secureTextEntry
      />
      <FormInput
        label="ORGANISATION (OPTIONAL)"
        value={organization}
        onChangeText={setOrganization}
        placeholder="Company name"
      />

      <TouchableOpacity style={styles.buttonPrimary} onPress={onSubmit} disabled={submitting}>
        <Text style={styles.buttonTextPrimary}>{submitting ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT ->'}</Text>
      </TouchableOpacity>
    </ScrollView>
  </KeyboardAvoidingView>
);

const StepVerifyEmail = ({ title, subtitle, buttonLabel, verificationCode, setVerificationCode, onSubmit, onBack, submitting }) => (
  <KeyboardAvoidingView style={{ flex: 1 }} behavior={AUTH_KEYBOARD_BEHAVIOR}>
    <ScrollView contentContainerStyle={styles.stepContainer}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backText}>{'<'} Back</Text>
      </TouchableOpacity>

      <View style={styles.avatarContainer}>
        <Image source={leonaAvatar} style={styles.avatarImageSmall} />
      </View>

      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepSubtitle}>{subtitle}</Text>

      <FormInput
        label="VERIFICATION CODE"
        value={verificationCode}
        onChangeText={setVerificationCode}
        placeholder="123456"
        keyboardType="number-pad"
      />

      <TouchableOpacity style={styles.buttonPrimary} onPress={onSubmit} disabled={submitting}>
        <Text style={styles.buttonTextPrimary}>{submitting ? 'VERIFYING...' : `${buttonLabel} ->`}</Text>
      </TouchableOpacity>
    </ScrollView>
  </KeyboardAvoidingView>
);

const StepAoiSetup = ({
  location,
  setLocation,
  locationLat,
  setLocationLat,
  locationLng,
  setLocationLng,
  locationError,
  setLocationError,
  eventTypeError,
  selectedAois,
  toggleAoi,
  applyPresetAoi,
  presets,
  suggestions,
  existingAois,
  defaultAoiLabel,
  selectedRadius,
  setSelectedRadius,
  selectedEventTypes,
  toggleEventType,
  onNext,
  loadingExistingAois,
}) => (
  <ScrollView contentContainerStyle={styles.stepContainer}>
    <ProgressBar count={2} filled={1} />

    <Text style={styles.stepTitle}>Set your AOIs</Text>
    <Text style={styles.stepSubtitle}>Choose the places LEONA should monitor first. {defaultAoiLabel} is preselected and this setup is written to your account and stored on this device.</Text>

    <View style={styles.searchContainer}>
      <TextInput
        style={styles.searchInput}
        placeholder="AOI name"
        placeholderTextColor={colors.textDim}
        value={location}
        onChangeText={(value) => {
          if (locationError) {
            setLocationError('');
          }
          setLocation(value);
        }}
      />
    </View>

    <View style={styles.coordinateRow}>
      <View style={[styles.searchContainer, styles.coordinateField]}>
        <TextInput
          style={styles.searchInput}
          placeholder="Latitude"
          placeholderTextColor={colors.textDim}
          value={locationLat}
          onChangeText={setLocationLat}
          keyboardType="numeric"
        />
      </View>
      <View style={[styles.searchContainer, styles.coordinateField]}>
        <TextInput
          style={styles.searchInput}
          placeholder="Longitude"
          placeholderTextColor={colors.textDim}
          value={locationLng}
          onChangeText={setLocationLng}
          keyboardType="numeric"
        />
      </View>
    </View>

    {locationError ? <Text style={styles.validationText}>{locationError}</Text> : null}

    <TouchableOpacity style={styles.buttonOutline} onPress={() => toggleAoi(location)}>
      <Text style={styles.buttonTextOutline}>ADD AOI</Text>
    </TouchableOpacity>

    <Text style={styles.helperText}>Use a preset to autofill coordinates or enter them manually. Presets are shortcuts only, not validation truth.</Text>

    <View style={styles.locationSuggestions}>
      {presets.map((preset) => (
        <TouchableOpacity
          key={preset.name}
          style={styles.locationChip}
          onPress={() => applyPresetAoi(preset)}
        >
          <Text style={styles.locationChipText}>{preset.name}</Text>
        </TouchableOpacity>
      ))}
    </View>

    {suggestions.length > 0 && (
      <View style={styles.summaryCard}>
        <SummaryRow label="Existing backend AOIs" value={loadingExistingAois ? 'Loading...' : `${suggestions.length}`} />
        <View style={styles.summaryDivider} />
        <Text style={styles.helperText}>AOIs already saved on the account remain available without any client-side lookup list.</Text>
      </View>
    )}

    <View style={styles.summaryCard}>
      <SummaryRow label="Selected AOIs" value={selectedAois.length ? `${selectedAois.length}` : 'None'} />
      <View style={styles.summaryDivider} />
      <SummaryRow label="Existing AOIs" value={loadingExistingAois ? 'Loading...' : `${existingAois.length}`} />
    </View>

    <View style={styles.mapPreview}>
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapText}>
          {selectedAois.length > 0 ? selectedAois.map((item) => item.name).join(' | ') : 'Add at least one AOI or use an existing backend AOI'}
        </Text>
      </View>
    </View>

    <Text style={styles.radiusLabel}>Monitoring radius</Text>
    <View style={styles.radiusButtons}>
      {[25, 50, 100, 200].map((radius) => (
        <TouchableOpacity
          key={radius}
          style={[styles.radiusButton, selectedRadius === radius && styles.radiusButtonSelected]}
          onPress={() => setSelectedRadius(radius)}
        >
          <Text style={[styles.radiusButtonText, selectedRadius === radius && styles.radiusButtonTextSelected]}>
            {radius}km
          </Text>
        </TouchableOpacity>
      ))}
    </View>

    <Text style={styles.radiusLabel}>Event types</Text>
    <View style={styles.locationSuggestions}>
      {EVENT_TYPE_OPTIONS.map((eventType) => (
        <TouchableOpacity
          key={eventType.key}
          style={[styles.locationChip, selectedEventTypes.includes(eventType.key) && styles.locationChipSelected]}
          onPress={() => toggleEventType(eventType.key)}
        >
          <Text
            style={[
              styles.locationChipText,
              selectedEventTypes.includes(eventType.key) && styles.locationChipTextSelected,
            ]}
          >
            {eventType.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>

    {eventTypeError ? <Text style={styles.validationText}>{eventTypeError}</Text> : null}

    <TouchableOpacity
      style={[styles.buttonPrimary, selectedEventTypes.length === 0 && styles.buttonPrimaryDisabled]}
      onPress={onNext}
    >
      <Text style={styles.buttonTextPrimary}>NEXT -></Text>
    </TouchableOpacity>
  </ScrollView>
);

const StepReady = ({ location, radius, aois, eventTypes, product, productLabel, eventTypeError, onComplete, pulseAnim, submitting }) => {
  const productData = getProductConfig(product);
  const isEventTypeSelectionEmpty = !eventTypes || eventTypes.length === 0;

  return (
    <ScrollView contentContainerStyle={styles.stepContainer}>
      <ProgressBar count={2} filled={2} />

      <Animated.View style={[styles.avatarContainer, { transform: [{ scale: pulseAnim }] }]}>
        <Image source={leonaAvatar} style={styles.avatarImage} />
      </Animated.View>

      <Text style={styles.stepTitle}>LEONA is configured.</Text>
      <Text style={styles.stepSubtitle}>
        I am now monitoring {(aois && aois[0]) || location || 'your area'} for {eventTypes?.length || 0} selected event categories in real time.
      </Text>

      <View style={styles.summaryCard}>
        <SummaryRow label="Product" value={productLabel} color={productData?.accent} />
        <View style={styles.summaryDivider} />
        <SummaryRow label="Primary AOI" value={(aois && aois[0]) || location || 'Not set'} />
        <View style={styles.summaryDivider} />
        <SummaryRow label="AOIs" value={`${aois?.length || 0}`} />
        <View style={styles.summaryDivider} />
        <SummaryRow label="Radius" value={`${radius}km`} />
        <View style={styles.summaryDivider} />
        <SummaryRow label="Event Types" value={`${eventTypes?.length || 0}`} />
      </View>

      {eventTypeError ? <Text style={styles.validationText}>{eventTypeError}</Text> : null}

      <TouchableOpacity
        style={[styles.buttonPrimary, (submitting || isEventTypeSelectionEmpty) && styles.buttonPrimaryDisabled]}
        onPress={onComplete}
        disabled={submitting || isEventTypeSelectionEmpty}
      >
        <Text style={styles.buttonTextPrimary}>
          {submitting ? 'SAVING AOIS...' : `ENTER ${productLabel.toUpperCase()} ->`}
        </Text>
      </TouchableOpacity>

      <Text style={styles.footerText}>You can change these anytime in Settings</Text>
    </ScrollView>
  );
};

const FormInput = ({ label, ...props }) => (
  <View style={styles.inputContainer}>
    <Text style={styles.inputLabel}>{label}</Text>
    <TextInput
      style={styles.textInput}
      placeholderTextColor={colors.textDim}
      autoCapitalize="none"
      autoCorrect={false}
      {...props}
    />
  </View>
);

const ProgressBar = ({ count, filled }) => (
  <View style={styles.progressBar}>
    {Array.from({ length: count }, (_, index) => (
      <View
        key={index}
        style={[styles.progressSegment, index < filled && styles.progressFilled]}
      />
    ))}
  </View>
);

const SummaryRow = ({ label, value, color }) => (
  <View style={styles.summaryRow}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={[styles.summaryValue, color ? { color } : null]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  welcomeContainer: {
    flex: 1,
  },
  welcomeLogoArea: {
    height: SCREEN_HEIGHT * 0.52,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 52,
  },
  welcomeLogo: {
    width: WELCOME_LOGO_SIZE,
    height: WELCOME_LOGO_SIZE,
  },
  welcomeContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    justifyContent: 'center',
  },
  stepContainer: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    paddingTop: 60,
  },
  backButton: {
    marginBottom: spacing.lg,
  },
  backText: {
    color: colors.blue,
    fontSize: 14,
    fontWeight: '600',
  },
  progressBar: {
    flexDirection: 'row',
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  progressSegment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.textDim,
  },
  progressFilled: {
    backgroundColor: colors.blue,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    marginTop: spacing.lg,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: colors.purpleLight,
  },
  avatarImageSmall: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: colors.purpleLight,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSec,
    textAlign: 'center',
    marginBottom: spacing.xl,
    letterSpacing: 1.5,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  stepSubtitle: {
    fontSize: 14,
    color: colors.textSec,
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  buttonPrimary: {
    backgroundColor: colors.blue,
    paddingVertical: spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  buttonPrimaryDisabled: {
    opacity: 0.45,
  },
  buttonTextPrimary: {
    color: colors.bg,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  buttonOutline: {
    borderWidth: 1,
    borderColor: colors.blue,
    paddingVertical: spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  buttonTextOutline: {
    color: colors.blue,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  linkText: {
    fontSize: 14,
    color: colors.blue,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  helperText: {
    fontSize: 12,
    color: colors.textDim,
    marginBottom: spacing.lg,
    lineHeight: 18,
  },
  validationText: {
    fontSize: 12,
    color: colors.critical,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  faceIDBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 14,
    backgroundColor: colors.panel,
    marginBottom: spacing.lg,
  },
  faceIDText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: 0.2,
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  orText: {
    fontSize: 11,
    color: colors.textDim,
    fontWeight: '500',
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  rememberToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.textDim,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.blue,
    borderColor: colors.blue,
  },
  checkboxTick: {
    color: colors.bg,
    fontSize: 9,
    fontWeight: '800',
  },
  rememberText: {
    fontSize: 13,
    color: colors.textSec,
    fontWeight: '500',
  },
  forgotText: {
    fontSize: 13,
    color: colors.blue,
  },
  demoNotice: {
    fontSize: 11,
    color: colors.textDim,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: spacing.md,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: 10,
    color: colors.textSec,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.panel,
    color: colors.text,
    fontSize: 14,
  },
  featurePills: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
    marginTop: spacing.xl,
  },
  pill: {
    backgroundColor: colors.panel,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillText: {
    fontSize: 12,
    color: colors.textSec,
    fontWeight: '500',
  },
  productCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.panel,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  productIconText: {
    fontSize: 13,
    fontWeight: '700',
  },
  productInfo: {
    flex: 1,
  },
  productLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  productDesc: {
    fontSize: 12,
    color: colors.textSec,
  },
  productCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productCheckText: {
    color: colors.bg,
    fontSize: 10,
    fontWeight: '700',
  },
  searchContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.panel,
    marginBottom: spacing.md,
  },
  searchInput: {
    paddingVertical: 14,
    color: colors.text,
    fontSize: 14,
  },
  coordinateRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  coordinateField: {
    flex: 1,
    marginBottom: 0,
  },
  locationSuggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  locationChip: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  locationChipSelected: {
    borderColor: colors.blue,
    backgroundColor: colors.blueDim,
  },
  locationChipText: {
    fontSize: 12,
    color: colors.textSec,
    fontWeight: '500',
  },
  locationChipTextSelected: {
    color: colors.blue,
  },
  mapPreview: {
    height: 120,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPlaceholder: {
    alignItems: 'center',
  },
  mapText: {
    fontSize: 12,
    color: colors.textDim,
  },
  radiusLabel: {
    fontSize: 12,
    color: colors.textSec,
    marginBottom: spacing.md,
    letterSpacing: 0.5,
  },
  radiusButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  radiusButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    alignItems: 'center',
  },
  radiusButtonSelected: {
    backgroundColor: colors.blueDim,
    borderColor: colors.blue,
  },
  radiusButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSec,
  },
  radiusButtonTextSelected: {
    color: colors.blue,
  },
  summaryCard: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSec,
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '700',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  copyrightText: {
    fontSize: 10,
    color: colors.textDim,
    textAlign: 'center',
    marginTop: spacing.md,
    letterSpacing: 0.3,
  },
  footerText: {
    fontSize: 12,
    color: colors.textDim,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
