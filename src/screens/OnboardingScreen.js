import React, { useState, useEffect, useContext } from 'react';
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
import { colors, spacing } from '../theme';
import { AppContext } from '../../App';

const leonaAvatar = require('../assets/leona-avatar.png');
const leonaBadge = require('../assets/leona-badge.png');

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');

const EVENT_TYPES = [
  { id: 'wildfire', label: 'Wildfire', emoji: '🔥' },
  { id: 'hurricanes', label: 'Hurricanes', emoji: '🌀' },
  { id: 'floods', label: 'Floods', emoji: '🌊' },
  { id: 'earthquakes', label: 'Earthquakes', emoji: '⚡' },
  { id: 'conflict', label: 'Conflict', emoji: '⚔️' },
  { id: 'drought', label: 'Drought', emoji: '☀️' },
  { id: 'volcanic', label: 'Volcanic', emoji: '🌋' },
  { id: 'health', label: 'Health', emoji: '🦠' },
];

const PRODUCTS = [
  {
    id: 'guardian_pro',
    label: 'Guardian Pro',
    desc: 'Enterprise, EMS & Law Enforcement',
    emoji: '🏢',
    accent: colors.blue,
  },
  {
    id: 'event360',
    label: 'EVENT 360',
    desc: 'Insurance & Claims Processing',
    emoji: '📋',
    accent: '#FF9800',
  },
  {
    id: 'guardian',
    label: 'Guardian',
    desc: 'Personal & Family Safety',
    emoji: '👤',
    accent: colors.purple,
  },
];

export default function OnboardingScreen() {
  const { handleOnboardingComplete } = useContext(AppContext);
  // Steps: 0=welcome/auth, 1=sign-in form OR skip, 2=product select, 3=location, 4=interests, 5=ready
  const [step, setStep] = useState(0);
  const [authMode, setAuthMode] = useState(null); // 'signin', 'create', 'guest'
  const [email, setEmail] = useState('example@user.com');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [fullName, setFullName] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('guardian_pro');
  const [location, setLocation] = useState('Sydney, Australia');
  const [selectedRadius, setSelectedRadius] = useState(50);
  const [selectedTypes, setSelectedTypes] = useState([
    'wildfire',
    'hurricanes',
    'floods',
    'conflict',
  ]);
  const [pulseAnim] = useState(new Animated.Value(1));

  // Pulsing animation for final step
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
  }, [step, pulseAnim]);

  const toggleEventType = (typeId) => {
    setSelectedTypes((prev) =>
      prev.includes(typeId)
        ? prev.filter((id) => id !== typeId)
        : [...prev, typeId]
    );
  };

  const handleSignIn = () => {
    // Demo: accept any email/password
    if (!email.trim()) {
      Alert.alert('Email required', 'Please enter your email address.');
      return;
    }
    setStep(2); // go to product selection
  };

  const handleCreateAccount = () => {
    if (!fullName.trim() || !email.trim()) {
      Alert.alert('Required fields', 'Please enter your name and email.');
      return;
    }
    setStep(2); // go to product selection
  };

  const handleGuestContinue = () => {
    setEmail('guest@leona.ai');
    setFullName('Guest User');
    setStep(2); // go to product selection
  };

  const handleComplete = () => {
    handleOnboardingComplete({
      authMode,
      email,
      fullName,
      product: selectedProduct,
      location,
      radius: selectedRadius,
      eventTypes: selectedTypes,
    });
  };

  const productLabel = PRODUCTS.find((p) => p.id === selectedProduct)?.label || 'LEONA';

  return (
    <View style={styles.container}>
      {step === 0 && (
        <StepWelcome
          onSignIn={() => { setAuthMode('signin'); setStep(1); }}
          onCreateAccount={() => { setAuthMode('create'); setStep(1); }}
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
          onSubmit={handleCreateAccount}
          onBack={() => setStep(0)}
        />
      )}
      {step === 2 && (
        <StepProductSelect
          selectedProduct={selectedProduct}
          setSelectedProduct={setSelectedProduct}
          onNext={() => setStep(3)}
        />
      )}
      {step === 3 && (
        <StepLocation
          location={location}
          setLocation={setLocation}
          selectedRadius={selectedRadius}
          setSelectedRadius={setSelectedRadius}
          onNext={() => setStep(5)}
          onSkip={() => setStep(5)}
        />
      )}
      {step === 4 && (
        <StepInterests
          selectedTypes={selectedTypes}
          toggleEventType={toggleEventType}
          onNext={() => setStep(5)}
        />
      )}
      {step === 5 && (
        <StepReady
          location={location}
          radius={selectedRadius}
          eventTypes={selectedTypes}
          product={selectedProduct}
          productLabel={productLabel}
          onComplete={handleComplete}
          pulseAnim={pulseAnim}
        />
      )}
    </View>
  );
}

// STEP 0 - WELCOME / AUTH OPTIONS
const StepWelcome = ({ onSignIn, onCreateAccount, onGuest }) => (
  <View style={styles.welcomeContainer}>
    {/* Top half: full LEONA badge logo */}
    <View style={styles.welcomeLogoArea}>
      <Image source={leonaBadge} style={styles.welcomeLogo} resizeMode="contain" />
    </View>

    {/* Bottom half: title, tagline, buttons */}
    <View style={styles.welcomeContent}>
      {/* Title + tagline */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>LEONA</Text>
      </View>
      <Text style={styles.subtitle}>Monitor. Guide. Protect.</Text>

      {/* Buttons */}
      <TouchableOpacity style={styles.buttonPrimary} onPress={onSignIn}>
        <Text style={styles.buttonTextPrimary}>SIGN IN</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.buttonOutline} onPress={onCreateAccount}>
        <Text style={styles.buttonTextOutline}>CREATE ACCOUNT</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onGuest}>
        <Text style={styles.linkText}>Continue as Guest  →</Text>
      </TouchableOpacity>

      {/* Feature Pills */}
      <View style={styles.featurePills}>
        {['21 Disaster Types','AI Intelligence','Live Data','Global News','Markets','Sports'].map((label) => (
          <View key={label} style={styles.pill}>
            <Text style={styles.pillText}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Footer */}
      <Text style={styles.copyrightText}>Property of Guardian Space</Text>
    </View>
  </View>
);

// STEP 1a - SIGN IN FORM
const StepSignIn = ({ email, setEmail, password, setPassword, rememberMe, setRememberMe, onSubmit, onBack }) => {
  const handleFaceID = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        Alert.alert('Face ID unavailable', 'This device does not support biometric authentication.');
        return;
      }
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        Alert.alert('Face ID not set up', 'Please enable Face ID in your device Settings first.');
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
    } catch (e) {
      Alert.alert('Authentication error', e.message);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.stepContainer}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.avatarContainer}>
          <Image source={leonaAvatar} style={styles.avatarImageSmall} />
        </View>

        <Text style={styles.stepTitle}>Welcome back</Text>
        <Text style={styles.stepSubtitle}>Sign in to your LEONA account</Text>

        {/* Face ID button */}
        <TouchableOpacity style={styles.faceIDBtn} onPress={handleFaceID} activeOpacity={0.75}>
          <Text style={styles.faceIDIcon}>󿿣</Text>
          <Text style={styles.faceIDText}>Sign in with Face ID</Text>
        </TouchableOpacity>

        <View style={styles.orDivider}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>or use email</Text>
          <View style={styles.orLine} />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>EMAIL</Text>
          <TextInput
            style={styles.textInput}
            placeholder="you@company.com"
            placeholderTextColor={colors.textDim}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>PASSWORD</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter password (optional in demo)"
            placeholderTextColor={colors.textDim}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        {/* Remember me + Forgot password row */}
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

        <TouchableOpacity style={styles.buttonPrimary} onPress={onSubmit}>
          <Text style={styles.buttonTextPrimary}>SIGN IN →</Text>
        </TouchableOpacity>

        <Text style={styles.demoNotice}>
          Demo mode — tap Sign In to continue
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// STEP 1b - CREATE ACCOUNT FORM
const StepCreateAccount = ({ fullName, setFullName, email, setEmail, password, setPassword, onSubmit, onBack }) => (
  <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView contentContainerStyle={styles.stepContainer}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.avatarContainer}>
        <Image source={leonaAvatar} style={styles.avatarImageSmall} />
      </View>

      <Text style={styles.stepTitle}>Create your account</Text>
      <Text style={styles.stepSubtitle}>LEONA will configure your intelligence dashboard</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>FULL NAME</Text>
        <TextInput
          style={styles.textInput}
          placeholder="John Smith"
          placeholderTextColor={colors.textDim}
          value={fullName}
          onChangeText={setFullName}
          autoCorrect={false}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>EMAIL</Text>
        <TextInput
          style={styles.textInput}
          placeholder="you@company.com"
          placeholderTextColor={colors.textDim}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoCorrect={false}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>PASSWORD</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Create a password"
          placeholderTextColor={colors.textDim}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>ORGANISATION (OPTIONAL)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Company name"
          placeholderTextColor={colors.textDim}
          autoCorrect={false}
        />
      </View>

      <TouchableOpacity style={styles.buttonPrimary} onPress={onSubmit}>
        <Text style={styles.buttonTextPrimary}>CREATE ACCOUNT →</Text>
      </TouchableOpacity>

      <Text style={styles.demoNotice}>
        Demo mode — enter any details to continue
      </Text>
    </ScrollView>
  </KeyboardAvoidingView>
);

// STEP 2 - PRODUCT SELECTION
const StepProductSelect = ({ selectedProduct, setSelectedProduct, onNext }) => (
  <ScrollView contentContainerStyle={styles.stepContainer}>
    <View style={styles.progressBar}>
      <View style={[styles.progressSegment, styles.progressFilled]} />
      <View style={styles.progressSegment} />
      <View style={styles.progressSegment} />
    </View>

    <Text style={styles.stepTitle}>How will you use LEONA?</Text>
    <Text style={styles.stepSubtitle}>
      Select your profile and LEONA will configure the right tools, layers, and intelligence for you.
    </Text>

    {PRODUCTS.map((product) => (
      <TouchableOpacity
        key={product.id}
        style={[
          styles.productCard,
          selectedProduct === product.id && {
            borderColor: product.accent,
            backgroundColor: `${product.accent}10`,
          },
        ]}
        onPress={() => setSelectedProduct(product.id)}
        activeOpacity={0.7}
      >
        <View style={styles.productRow}>
          <Text style={styles.productEmoji}>{product.emoji}</Text>
          <View style={styles.productInfo}>
            <Text style={[styles.productLabel, selectedProduct === product.id && { color: product.accent }]}>
              {product.label}
            </Text>
            <Text style={styles.productDesc}>{product.desc}</Text>
          </View>
          {selectedProduct === product.id && (
            <View style={[styles.productCheck, { backgroundColor: product.accent }]}>
              <Text style={styles.productCheckText}>✓</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    ))}

    <TouchableOpacity style={styles.buttonPrimary} onPress={onNext}>
      <Text style={styles.buttonTextPrimary}>NEXT →</Text>
    </TouchableOpacity>
  </ScrollView>
);

// STEP 3 - LOCATION
const StepLocation = ({
  location,
  setLocation,
  selectedRadius,
  setSelectedRadius,
  onNext,
  onSkip,
}) => (
  <ScrollView contentContainerStyle={styles.stepContainer}>
    <View style={styles.progressBar}>
      <View style={[styles.progressSegment, styles.progressFilled]} />
      <View style={[styles.progressSegment, styles.progressFilled]} />
      <View style={styles.progressSegment} />
    </View>

    <Text style={styles.stepTitle}>Where are you based?</Text>
    <Text style={styles.stepSubtitle}>
      LEONA will prioritise intelligence and alerts for this area
    </Text>

    <View style={styles.searchContainer}>
      <Text style={styles.searchIcon}>📍</Text>
      <TextInput
        style={styles.searchInput}
        placeholder="Enter city or region"
        placeholderTextColor={colors.textDim}
        value={location}
        onChangeText={setLocation}
      />
    </View>

    {/* Quick Location Suggestions */}
    <View style={styles.locationSuggestions}>
      {['Sydney, Australia', 'London, UK', 'New York, US', 'Dubai, UAE', 'Singapore'].map((loc) => (
        <TouchableOpacity
          key={loc}
          style={[styles.locationChip, location === loc && styles.locationChipSelected]}
          onPress={() => setLocation(loc)}
        >
          <Text style={[styles.locationChipText, location === loc && styles.locationChipTextSelected]}>
            {loc}
          </Text>
        </TouchableOpacity>
      ))}
    </View>

    {/* Map Preview */}
    <View style={styles.mapPreview}>
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapIcon}>🗺</Text>
        <Text style={styles.mapText}>{location || 'Select a location'}</Text>
      </View>
    </View>

    {/* Radius Selection */}
    <Text style={styles.radiusLabel}>Monitoring radius</Text>
    <View style={styles.radiusButtons}>
      {[25, 50, 100, 200].map((radius) => (
        <TouchableOpacity
          key={radius}
          style={[
            styles.radiusButton,
            selectedRadius === radius && styles.radiusButtonSelected,
          ]}
          onPress={() => setSelectedRadius(radius)}
        >
          <Text
            style={[
              styles.radiusButtonText,
              selectedRadius === radius && styles.radiusButtonTextSelected,
            ]}
          >
            {radius}km
          </Text>
        </TouchableOpacity>
      ))}
    </View>

    <TouchableOpacity style={styles.buttonPrimary} onPress={onNext}>
      <Text style={styles.buttonTextPrimary}>NEXT →</Text>
    </TouchableOpacity>

    <TouchableOpacity onPress={onSkip}>
      <Text style={styles.linkText}>Skip for now</Text>
    </TouchableOpacity>
  </ScrollView>
);

// STEP 4 - INTERESTS
const StepInterests = ({ selectedTypes, toggleEventType, onNext }) => (
  <ScrollView contentContainerStyle={styles.stepContainer}>
    <View style={styles.progressBar}>
      <View style={[styles.progressSegment, styles.progressFilled]} />
      <View style={[styles.progressSegment, styles.progressFilled]} />
      <View style={[styles.progressSegment, styles.progressFilled]} />
      <View style={styles.progressSegment} />
    </View>

    <Text style={styles.stepTitle}>What should LEONA monitor?</Text>

    <View style={styles.eventGrid}>
      {EVENT_TYPES.map((type) => (
        <TouchableOpacity
          key={type.id}
          style={[
            styles.eventCard,
            selectedTypes.includes(type.id) && styles.eventCardSelected,
          ]}
          onPress={() => toggleEventType(type.id)}
        >
          <Text style={styles.eventEmoji}>{type.emoji}</Text>
          <Text style={styles.eventLabel}>{type.label}</Text>
          {selectedTypes.includes(type.id) && (
            <View style={styles.checkmark}>
              <Text style={styles.checkmarkText}>✓</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>

    <TouchableOpacity style={styles.buttonPrimary} onPress={onNext}>
      <Text style={styles.buttonTextPrimary}>NEXT →</Text>
    </TouchableOpacity>
  </ScrollView>
);

// STEP 5 - READY
const StepReady = ({ location, radius, eventTypes, product, productLabel, onComplete, pulseAnim }) => {
  const productData = PRODUCTS.find((p) => p.id === product);

  return (
    <ScrollView contentContainerStyle={styles.stepContainer}>
      <View style={styles.progressBar}>
        <View style={[styles.progressSegment, styles.progressFilled]} />
        <View style={[styles.progressSegment, styles.progressFilled]} />
        <View style={[styles.progressSegment, styles.progressFilled]} />
      </View>

      <Animated.View
        style={[styles.avatarContainer, { transform: [{ scale: pulseAnim }] }]}
      >
        <Image source={leonaAvatar} style={styles.avatarImage} />
      </Animated.View>

      <Text style={styles.stepTitle}>LEONA is configured.</Text>

      <Text style={styles.stepSubtitle}>
        I'm now monitoring {location || 'your area'} across all 21+ event types in real-time.
      </Text>

      {/* Config Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{productData?.emoji} Product</Text>
          <Text style={[styles.summaryValue, { color: productData?.accent }]}>{productLabel}</Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>📍 Location</Text>
          <Text style={styles.summaryValue}>{location || 'Not set'}</Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>📊 Radius</Text>
          <Text style={styles.summaryValue}>{radius}km</Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>🔔 Monitoring</Text>
          <Text style={styles.summaryValue}>21+ Event Types</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.buttonPrimary} onPress={onComplete}>
        <Text style={styles.buttonTextPrimary}>ENTER {productLabel.toUpperCase()} →</Text>
      </TouchableOpacity>

      <Text style={styles.footerText}>
        You can change these anytime in Settings
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  // WELCOME STEP LAYOUT — logo fills top half, content fills bottom half
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
    width: SCREEN_HEIGHT * 0.48,
    height: SCREEN_HEIGHT * 0.48,
  },
  welcomeContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    justifyContent: 'center',
  },

  // LAYOUT
  stepContainer: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    paddingTop: 60,
  },

  // BACK BUTTON
  backButton: {
    marginBottom: spacing.lg,
  },
  backText: {
    color: colors.blue,
    fontSize: 14,
    fontWeight: '600',
  },

  // PROGRESS BAR
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

  // AVATAR
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

  // TITLES & TEXT
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
  welcomeDesc: {
    fontSize: 14,
    color: colors.textSec,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
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

  // BUTTONS
  buttonPrimary: {
    backgroundColor: colors.blue,
    paddingVertical: spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: spacing.lg,
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
  // Face ID button
  faceIDBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 14,
    backgroundColor: colors.panel,
    marginBottom: spacing.lg,
  },
  faceIDIcon: {
    fontSize: 22,
    color: colors.text,
  },
  faceIDText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: 0.2,
  },

  // OR divider
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

  // Remember me row
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
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 13,
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

  // INPUT FIELDS
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

  // FEATURE PILLS
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

  // PRODUCT CARDS
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
  productEmoji: {
    fontSize: 28,
    marginRight: spacing.lg,
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
    fontSize: 14,
    fontWeight: '700',
  },

  // SEARCH INPUT
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.panel,
    marginBottom: spacing.md,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: spacing.md,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 14,
  },

  // LOCATION SUGGESTIONS
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

  // MAP PREVIEW
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
  mapIcon: {
    fontSize: 28,
    marginBottom: spacing.sm,
  },
  mapText: {
    fontSize: 12,
    color: colors.textDim,
  },

  // RADIUS SELECTION
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

  // EVENT GRID
  eventGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  eventCard: {
    width: '48%',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    alignItems: 'center',
  },
  eventCardSelected: {
    borderColor: colors.blue,
    backgroundColor: colors.blueDim,
  },
  eventEmoji: {
    fontSize: 28,
    marginBottom: spacing.sm,
  },
  eventLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  checkmark: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.blue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: colors.bg,
    fontSize: 12,
    fontWeight: '700',
  },

  // SUMMARY CARD
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
    marginBottom: spacing.md,
  },
  summarySection: {
    marginTop: spacing.md,
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
  typePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  typePill: {
    backgroundColor: colors.blueDim,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 16,
  },
  typePillText: {
    fontSize: 11,
    color: colors.blue,
    fontWeight: '600',
  },

  copyrightText: {
    fontSize: 10,
    color: colors.textDim,
    textAlign: 'center',
    marginTop: spacing.md,
    letterSpacing: 0.3,
  },

  // FOOTER
  footerText: {
    fontSize: 12,
    color: colors.textDim,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
