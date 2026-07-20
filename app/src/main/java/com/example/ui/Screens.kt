package com.example.ui

import android.app.DatePickerDialog
import android.app.TimePickerDialog
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.example.data.Astrologer
import com.example.data.ReportSession
import com.example.data.UserProfile
import com.example.ui.theme.*
import java.text.SimpleDateFormat
import java.util.*
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.LinearGradient
import android.graphics.Shader
import android.net.Uri
import android.content.Context
import android.content.Intent
import androidx.core.content.FileProvider
import java.io.File
import java.io.FileOutputStream

// --- Custom Programmatic Cosmic Starry Background Modifier ---
fun Modifier.mysticalCosmicBackground(): Modifier = this.drawBehind {
    val backgroundBrush = Brush.radialGradient(
        colors = listOf(Color(0xFF141124), Color(0xFF0B0814)),
        center = Offset(size.width / 2, size.height / 3),
        radius = size.maxDimension / 1.2f
    )
    drawRect(brush = backgroundBrush)

    // Draw some subtle gold stars
    val starCount = 40
    val random = java.util.Random(1337)
    for (i in 0 until starCount) {
        val x = random.nextFloat() * size.width
        val y = random.nextFloat() * size.height
        val radius = random.nextFloat() * 2.5f + 1f
        val alpha = random.nextFloat() * 0.6f + 0.2f
        drawCircle(
            color = CelestialGold.copy(alpha = alpha),
            radius = radius,
            center = Offset(x, y)
        )
    }

    // Draw subtle concentric golden orbital paths
    val centerX = size.width / 2f
    val centerY = size.height / 3.5f
    drawCircle(
        color = CelestialGold.copy(alpha = 0.06f),
        radius = size.width / 3.5f,
        center = Offset(centerX, centerY),
        style = Stroke(width = 1.5f)
    )
    drawCircle(
        color = CelestialGold.copy(alpha = 0.03f),
        radius = size.width / 2.2f,
        center = Offset(centerX, centerY),
        style = Stroke(width = 1f)
    )
}

// --- Main Navigation Layout Screen ---
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AstrologyMainLayout(
    viewModel: AstrologyViewModel,
    modifier: Modifier = Modifier
) {
    val currentScreen by viewModel.currentScreen.collectAsState()
    val selectedTab by viewModel.selectedTab.collectAsState()
    val showBillingSheet by viewModel.showBillingSheet.collectAsState()
    val billingSuccessAnim by viewModel.billingSuccessAnim.collectAsState()
    val activeSession by viewModel.activeSession.collectAsState()
    val currentBillingItem by viewModel.currentBillingItem.collectAsState()
    val billingErrorMsg by viewModel.billingErrorMsg.collectAsState()
    val userProfile by viewModel.userProfile.collectAsState()
    val referralNotification by viewModel.referralNotification.collectAsState()

    val context = LocalContext.current

    Scaffold(
        modifier = modifier.fillMaxSize(),
        bottomBar = {
            if (currentScreen != Screen.Onboarding && currentScreen != Screen.Suspense) {
                NavigationBar(
                    containerColor = DeepMidnight,
                    tonalElevation = 8.dp,
                    modifier = Modifier.navigationBarsPadding()
                ) {
                    NavigationBarItem(
                        selected = selectedTab == 0,
                        onClick = { viewModel.setTab(0) },
                        label = { Text("Consult", fontWeight = FontWeight.Bold, color = if (selectedTab == 0) CelestialGold else SpaceLavender) },
                        icon = {
                            Icon(
                                imageVector = if (selectedTab == 0) Icons.Filled.Home else Icons.Outlined.Home,
                                contentDescription = "Consultation",
                                tint = if (selectedTab == 0) CelestialGold else SpaceLavender
                            )
                        },
                        colors = NavigationBarItemDefaults.colors(
                            indicatorColor = SoftPlum
                        )
                    )
                    NavigationBarItem(
                        selected = selectedTab == 1,
                        onClick = { viewModel.setTab(1) },
                        label = { Text("My Reports", fontWeight = FontWeight.Bold, color = if (selectedTab == 1) CelestialGold else SpaceLavender) },
                        icon = {
                            Icon(
                                imageVector = if (selectedTab == 1) Icons.Filled.ReceiptLong else Icons.Outlined.ReceiptLong,
                                contentDescription = "My Reports",
                                tint = if (selectedTab == 1) CelestialGold else SpaceLavender
                            )
                        },
                        colors = NavigationBarItemDefaults.colors(
                            indicatorColor = SoftPlum
                        )
                    )
                    NavigationBarItem(
                        selected = selectedTab == 2,
                        onClick = { viewModel.setTab(2) },
                        label = { Text("Profile", fontWeight = FontWeight.Bold, color = if (selectedTab == 2) CelestialGold else SpaceLavender) },
                        icon = {
                            Icon(
                                imageVector = if (selectedTab == 2) Icons.Filled.Person else Icons.Outlined.Person,
                                contentDescription = "Profile",
                                tint = if (selectedTab == 2) CelestialGold else SpaceLavender
                            )
                        },
                        colors = NavigationBarItemDefaults.colors(
                            indicatorColor = SoftPlum
                        )
                    )
                }
            }
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .mysticalCosmicBackground()
        ) {
            AnimatedContent(
                targetState = currentScreen,
                transitionSpec = {
                    fadeIn(animationSpec = tween(300)) togetherWith fadeOut(animationSpec = tween(300))
                },
                label = "ScreenTransition"
            ) { screen ->
                when (screen) {
                    Screen.Onboarding -> OnboardingScreen(viewModel)
                    Screen.AstrologerList -> AstrologerListScreen(viewModel)
                    Screen.IntakeForm -> IntakeFormScreen(viewModel)
                    Screen.Suspense -> SuspenseScreen(viewModel)
                    Screen.Paywall -> PaywallScreen(viewModel)
                    Screen.ReportView -> ReportViewScreen(viewModel)
                    Screen.MyReports -> MyReportsScreen(viewModel)
                    Screen.Profile -> ProfileScreen(viewModel)
                }
            }

            // --- Global Referral Success Notification Dialog ---
            referralNotification?.let { msg ->
                Dialog(
                    onDismissRequest = { viewModel.clearReferralNotification() }
                ) {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = DarkSpacePurple),
                        border = BorderStroke(2.dp, CelestialGold),
                        shape = RoundedCornerShape(24.dp),
                        modifier = Modifier.padding(24.dp).testTag("referral_success_dialog")
                    ) {
                        Column(
                            modifier = Modifier.padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text("🕉️", fontSize = 48.sp)
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = "Kalyan Ho! (Credit Earned)",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = CelestialGold,
                                textAlign = TextAlign.Center
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = msg,
                                color = GalacticWhite,
                                fontSize = 13.sp,
                                textAlign = TextAlign.Center,
                                lineHeight = 18.sp
                            )
                            Spacer(modifier = Modifier.height(20.dp))
                            Button(
                                onClick = { viewModel.clearReferralNotification() },
                                colors = ButtonDefaults.buttonColors(containerColor = CelestialGold),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth().height(42.dp).testTag("close_referral_success_dialog")
                            ) {
                                Text("JAI SHREE KRISHNA", color = DeepMidnight, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            }
                        }
                    }
                }
            }

            // --- Play Store Billing Simulation Bottom Sheet Dialog ---
            if (showBillingSheet) {
                Dialog(
                    onDismissRequest = { if (!billingSuccessAnim) viewModel.dismissPlayBilling() },
                    properties = DialogProperties(usePlatformDefaultWidth = false)
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(Color.Black.copy(alpha = 0.6f)),
                        contentAlignment = Alignment.BottomCenter
                    ) {
                        Surface(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp))
                                .background(DarkSpacePurple)
                                .testTag("billing_bottom_sheet"),
                            color = DarkSpacePurple
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(24.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                if (billingSuccessAnim) {
                                    // Confetti & Glowing Success indicator
                                    CelestialBadge(symbol = "✨", size = 80)
                                    Spacer(modifier = Modifier.height(16.dp))
                                    Text(
                                        text = "Payment Approved!",
                                        style = MaterialTheme.typography.titleLarge,
                                        color = CelestialGold,
                                        fontWeight = FontWeight.Bold,
                                        textAlign = TextAlign.Center
                                    )
                                    Text(
                                        text = when (val item = currentBillingItem) {
                                            is BillingItem.Subscription -> "Activating your Premium Consultation tier benefits..."
                                            is BillingItem.CreditsPack -> "Recharging your celestial wallet with ₹${item.creditsAmount}..."
                                            else -> "Unlocking your sacred astrology report..."
                                        },
                                        color = SpaceLavender,
                                        style = MaterialTheme.typography.bodyMedium,
                                        textAlign = TextAlign.Center,
                                        modifier = Modifier.padding(top = 8.dp)
                                    )
                                    Spacer(modifier = Modifier.height(24.dp))
                                    CircularProgressIndicator(color = CelestialGold)
                                } else {
                                    // Google Play Billing Simulator Header
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(
                                                imageVector = Icons.Filled.PlayArrow,
                                                contentDescription = "Google Play",
                                                tint = Color(0xFF34A853),
                                                modifier = Modifier.size(24.dp)
                                            )
                                            Spacer(modifier = Modifier.width(8.dp))
                                            Text(
                                                text = "Google Play Billing",
                                                style = MaterialTheme.typography.titleMedium,
                                                color = Color.White,
                                                fontWeight = FontWeight.Bold
                                            )
                                        }
                                        IconButton(onClick = { viewModel.dismissPlayBilling() }) {
                                            Icon(imageVector = Icons.Filled.Close, contentDescription = "Close", tint = Color.LightGray)
                                        }
                                    }

                                    Spacer(modifier = Modifier.height(12.dp))
                                    HorizontalDivider(color = SoftPlum)
                                    Spacer(modifier = Modifier.height(12.dp))

                                    // Dynamic Item description extraction
                                    val titleText = when (val item = currentBillingItem) {
                                        is BillingItem.SingleReport -> "Sacred Astrological Report"
                                        is BillingItem.Subscription -> item.name
                                        is BillingItem.CreditsPack -> item.name
                                        null -> "Sacred Consultation"
                                    }

                                    val subtitleText = when (val item = currentBillingItem) {
                                        is BillingItem.SingleReport -> "Consultant: ${item.session.astrologerName}"
                                        is BillingItem.Subscription -> "Premium Tier • Billed every ${item.period}"
                                        is BillingItem.CreditsPack -> "Add ₹${item.creditsAmount} to Celestial Wallet"
                                        null -> ""
                                    }

                                    val priceText = when (val item = currentBillingItem) {
                                        is BillingItem.SingleReport -> "₹${item.session.price}.00"
                                        is BillingItem.Subscription -> "₹${item.price}.00/${if (item.period == "week") "wk" else if (item.period == "month") "mo" else "yr"}"
                                        is BillingItem.CreditsPack -> "₹${item.price}.00"
                                        null -> "₹0.00"
                                    }

                                    val typeText = when (currentBillingItem) {
                                        is BillingItem.SingleReport -> "Consumable Sandbox Purchase"
                                        is BillingItem.Subscription -> "Auto-Renewing Play Subscription"
                                        is BillingItem.CreditsPack -> "In-App Credits Purchase"
                                        null -> "Sandbox Purchase"
                                    }

                                    // Product details card
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(
                                                text = titleText,
                                                style = MaterialTheme.typography.titleLarge,
                                                color = GalacticWhite,
                                                fontWeight = FontWeight.Bold
                                            )
                                            Text(
                                                text = subtitleText,
                                                style = MaterialTheme.typography.bodyMedium,
                                                color = SpaceLavender
                                            )
                                        }
                                        Text(
                                            text = priceText,
                                            style = MaterialTheme.typography.titleMedium,
                                            color = CelestialGold,
                                            fontWeight = FontWeight.ExtraBold
                                        )
                                    }

                                    Spacer(modifier = Modifier.height(12.dp))

                                    // Security Info
                                    Card(
                                        colors = CardDefaults.cardColors(containerColor = SoftPlum),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Row(
                                            modifier = Modifier.padding(12.dp),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Icon(
                                                imageVector = Icons.Filled.Security,
                                                contentDescription = "Secured",
                                                tint = CelestialGold,
                                                modifier = Modifier.size(24.dp)
                                            )
                                            Spacer(modifier = Modifier.width(12.dp))
                                            Column {
                                                Text(
                                                    text = typeText,
                                                    color = GalacticWhite,
                                                    fontWeight = FontWeight.Bold,
                                                    fontSize = 13.sp
                                                )
                                                Text(
                                                    text = "Secured via Google Play. Sandbox Mode active.",
                                                    color = SpaceLavender,
                                                    fontSize = 11.sp
                                                )
                                            }
                                        }
                                    }

                                    // Error message block if simulated failure occurs
                                    if (billingErrorMsg != null) {
                                        Card(
                                            colors = CardDefaults.cardColors(containerColor = Color(0xFFD32F2F).copy(alpha = 0.15f)),
                                            border = BorderStroke(1.dp, Color(0xFFD32F2F).copy(alpha = 0.6f)),
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(vertical = 12.dp)
                                        ) {
                                            Row(
                                                modifier = Modifier.padding(12.dp),
                                                verticalAlignment = Alignment.Top
                                            ) {
                                                Icon(
                                                    imageVector = Icons.Filled.Error,
                                                    contentDescription = "Error",
                                                    tint = Color(0xFFEF5350),
                                                    modifier = Modifier.size(20.dp)
                                                )
                                                Spacer(modifier = Modifier.width(8.dp))
                                                Column {
                                                    Text(
                                                        text = "Google Play Purchase Failed",
                                                        color = Color(0xFFEF5350),
                                                        fontWeight = FontWeight.Bold,
                                                        fontSize = 12.sp
                                                    )
                                                    Text(
                                                        text = billingErrorMsg ?: "",
                                                        color = GalacticWhite,
                                                        fontSize = 11.sp,
                                                        lineHeight = 15.sp,
                                                        modifier = Modifier.padding(top = 2.dp)
                                                    )
                                                }
                                            }
                                        }
                                    } else {
                                        Spacer(modifier = Modifier.height(16.dp))
                                    }

                                    // --- REFERRAL WALLET PAYMENT SECTOR ---
                                    if (currentBillingItem is BillingItem.SingleReport) {
                                        val userWalletBalance = userProfile?.walletBalance ?: 0
                                        val reportPrice = (currentBillingItem as BillingItem.SingleReport).session.price
                                        val hasEnoughBalance = userWalletBalance >= reportPrice

                                        Card(
                                            colors = CardDefaults.cardColors(containerColor = SoftPlum),
                                            border = BorderStroke(
                                                1.5.dp, 
                                                if (hasEnoughBalance) CelestialGold else Color.Gray.copy(alpha = 0.2f)
                                            ),
                                            shape = RoundedCornerShape(16.dp),
                                            modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp)
                                        ) {
                                            Column(modifier = Modifier.padding(16.dp)) {
                                                Row(
                                                    modifier = Modifier.fillMaxWidth(),
                                                    horizontalArrangement = Arrangement.SpaceBetween,
                                                    verticalAlignment = Alignment.CenterVertically
                                                ) {
                                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                                        Text("🪙", fontSize = 20.sp)
                                                        Spacer(modifier = Modifier.width(8.dp))
                                                        Text(
                                                            text = "Celestial Wallet",
                                                            fontWeight = FontWeight.Bold,
                                                            color = if (hasEnoughBalance) CelestialGold else SpaceLavender,
                                                            fontSize = 14.sp
                                                        )
                                                     }
                                                     Text(
                                                         text = "Balance: ₹$userWalletBalance",
                                                         fontSize = 13.sp,
                                                         fontWeight = FontWeight.Bold,
                                                         color = if (hasEnoughBalance) CelestialGold else SpaceLavender
                                                     )
                                                 }
                                                 
                                                 Spacer(modifier = Modifier.height(10.dp))
                                                 
                                                 Button(
                                                     onClick = { viewModel.completeWalletPurchase() },
                                                     enabled = hasEnoughBalance,
                                                     colors = ButtonDefaults.buttonColors(
                                                         containerColor = CelestialGold,
                                                         disabledContainerColor = Color.Gray.copy(alpha = 0.2f)
                                                     ),
                                                     shape = RoundedCornerShape(12.dp),
                                                     modifier = Modifier
                                                         .fillMaxWidth()
                                                         .testTag("pay_with_wallet_button")
                                                 ) {
                                                     Icon(
                                                         imageVector = Icons.Filled.Star,
                                                         contentDescription = null,
                                                         tint = if (hasEnoughBalance) DeepMidnight else Color.DarkGray,
                                                         modifier = Modifier.size(16.dp)
                                                     )
                                                     Spacer(modifier = Modifier.width(8.dp))
                                                     Text(
                                                         text = if (hasEnoughBalance) {
                                                             "PAY ₹$reportPrice WITH WALLET BALANCE"
                                                         } else {
                                                             "INSUFFICIENT BALANCE (NEED ₹$reportPrice)"
                                                         },
                                                         color = if (hasEnoughBalance) DeepMidnight else Color.DarkGray,
                                                         fontWeight = FontWeight.ExtraBold,
                                                         fontSize = 12.sp
                                                     )
                                                 }
                                             }
                                         }
                                         
                                         // Or Divider
                                         Row(
                                             modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp),
                                             verticalAlignment = Alignment.CenterVertically,
                                             horizontalArrangement = Arrangement.Center
                                         ) {
                                             HorizontalDivider(modifier = Modifier.weight(1f), color = SpaceLavender.copy(alpha = 0.1f))
                                             Text(
                                                 text = " OR PAY VIA GOOGLE PLAY ",
                                                 fontSize = 10.sp,
                                                 color = SpaceLavender.copy(alpha = 0.5f),
                                                 fontWeight = FontWeight.Bold,
                                                 modifier = Modifier.padding(horizontal = 8.dp)
                                             )
                                             HorizontalDivider(modifier = Modifier.weight(1f), color = SpaceLavender.copy(alpha = 0.1f))
                                         }
                                     }

                                    // INTERACTIVE SIMULATOR OUTCOMES SECTION
                                    Text(
                                        text = "SIMULATE PLAY STORE TRANSACTION OUTCOMES:",
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = CelestialGold.copy(alpha = 0.8f),
                                        modifier = Modifier.padding(bottom = 12.dp, top = 4.dp)
                                    )

                                    // 1. Success Button (Google Play Green)
                                    Button(
                                        onClick = { viewModel.completePurchaseSuccess() },
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .height(50.dp)
                                            .testTag("pay_confirm_button"),
                                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0F9D58)),
                                        shape = RoundedCornerShape(25.dp)
                                    ) {
                                        Icon(imageVector = Icons.Filled.Check, contentDescription = null, tint = Color.White)
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text(
                                            text = "SIMULATE SUCCESSFUL PURCHASE",
                                            fontWeight = FontWeight.Bold,
                                            color = Color.White,
                                            fontSize = 13.sp
                                        )
                                    }

                                    Spacer(modifier = Modifier.height(10.dp))

                                    // 2. Failure Buttons (Card Decline and Low Balance)
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        OutlinedButton(
                                            onClick = {
                                                viewModel.completePurchaseFailure("Your transaction was declined by the credit card issuer. Please select a different payment card in Google Play. (Code: BILLING_RESPONSE_RESULT_ITEM_UNAVAILABLE)")
                                            },
                                            modifier = Modifier
                                                .weight(1f)
                                                .height(44.dp)
                                                .testTag("simulate_decline_button"),
                                            colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFEF5350)),
                                            border = BorderStroke(1.dp, Color(0xFFEF5350).copy(alpha = 0.5f)),
                                            shape = RoundedCornerShape(22.dp)
                                        ) {
                                            Text("DECLINE CARD", fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                        }

                                        OutlinedButton(
                                            onClick = {
                                                viewModel.completePurchaseFailure("Google Play: Insufficient funds in your digital wallet. Please redeem a Play Gift Card or update your backup payment details. (Code: BILLING_RESPONSE_RESULT_ERROR)")
                                            },
                                            modifier = Modifier
                                                .weight(1f)
                                                .height(44.dp)
                                                .testTag("simulate_funds_button"),
                                            colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFEF5350)),
                                            border = BorderStroke(1.dp, Color(0xFFEF5350).copy(alpha = 0.5f)),
                                            shape = RoundedCornerShape(22.dp)
                                        ) {
                                            Text("LOW BALANCE", fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                        }
                                    }

                                    Spacer(modifier = Modifier.height(16.dp))
                                    Text(
                                        text = "By selecting any simulation above, you acknowledge this is a mock sandbox environment. Adi Jyotish Gurus calculations do not constitute official professional guidance.",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = Color.Gray,
                                        textAlign = TextAlign.Center,
                                        fontSize = 9.sp,
                                        lineHeight = 12.sp
                                    )
                                    Spacer(modifier = Modifier.height(8.dp))
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// --- Celestial Avatar Badge Helper ---
@Composable
fun CelestialBadge(
    symbol: String,
    size: Int = 54,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .size(size.dp)
            .clip(CircleShape)
            .background(
                Brush.linearGradient(
                    colors = listOf(SoftPlum, DarkSpacePurple, DeepMidnight)
                )
            )
            .border(1.5.dp, CelestialGold, CircleShape),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = symbol,
            fontSize = (size * 0.45).sp,
            textAlign = TextAlign.Center
        )
    }
}

// --- SCREEN 1: Onboarding with Firebase OTP & Disclaimer ---
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OnboardingScreen(viewModel: AstrologyViewModel) {
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var otpCode by remember { mutableStateOf("") }
    var consented by remember { mutableStateOf(false) }
    var selectedLanguage by remember { mutableStateOf("Hinglish") }

    val isVerifying by viewModel.isVerifyingOtp.collectAsState()
    val otpSent by viewModel.otpSent.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        // App Title & Celestial Icon
        CelestialBadge(symbol = "✨", size = 90)
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = "Adi Jyotish Gurus",
            fontSize = 32.sp,
            fontWeight = FontWeight.ExtraBold,
            color = CelestialGold,
            letterSpacing = 1.sp,
            textAlign = TextAlign.Center
        )
        Text(
            text = "Find world best astrologers",
            style = MaterialTheme.typography.bodyMedium,
            color = SpaceLavender,
            fontStyle = FontStyle.Italic,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(36.dp))

        Card(
            colors = CardDefaults.cardColors(containerColor = SoftPlum.copy(alpha = 0.85f)),
            border = BorderStroke(1.dp, CelestialGold.copy(alpha = 0.3f)),
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = if (!otpSent) "Vedic Onboarding" else "Enter Security OTP",
                    style = MaterialTheme.typography.titleLarge,
                    color = GalacticWhite,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(16.dp))

                if (!otpSent) {
                    // Step 1: Input Name and Phone
                    OutlinedTextField(
                        value = name,
                        onValueChange = { name = it },
                        label = { Text("Your Full Name", color = SpaceLavender) },
                        leadingIcon = { Icon(Icons.Default.Person, contentDescription = null, tint = CelestialGold) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("onboarding_name_input"),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = CelestialGold,
                            unfocusedBorderColor = SpaceLavender.copy(alpha = 0.5f),
                            focusedLabelColor = CelestialGold,
                            unfocusedLabelColor = SpaceLavender,
                            focusedTextColor = GalacticWhite,
                            unfocusedTextColor = GalacticWhite
                        ),
                        singleLine = true
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    OutlinedTextField(
                        value = phone,
                        onValueChange = { phone = it },
                        label = { Text("Phone Number", color = SpaceLavender) },
                        leadingIcon = { Icon(Icons.Default.Phone, contentDescription = null, tint = CelestialGold) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("onboarding_phone_input"),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = CelestialGold,
                            unfocusedBorderColor = SpaceLavender.copy(alpha = 0.5f),
                            focusedLabelColor = CelestialGold,
                            unfocusedLabelColor = SpaceLavender,
                            focusedTextColor = GalacticWhite,
                            unfocusedTextColor = GalacticWhite
                        ),
                        singleLine = true
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    Text(
                        text = "Preferred Language / भाषा चुनें",
                        style = MaterialTheme.typography.bodyMedium,
                        color = CelestialGold,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.fillMaxWidth(),
                        textAlign = TextAlign.Start
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        listOf("Hinglish", "Hindi", "English").forEach { lang ->
                            val isSelected = selectedLanguage == lang
                            val label = when (lang) {
                                "Hinglish" -> "Hinglish"
                                "Hindi" -> "हिन्दी (Hindi)"
                                else -> "English"
                            }
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .padding(horizontal = 4.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(if (isSelected) CelestialGold else SoftPlum.copy(alpha = 0.5f))
                                    .border(1.dp, if (isSelected) CelestialGold else SpaceLavender.copy(alpha = 0.3f), RoundedCornerShape(8.dp))
                                    .clickable { selectedLanguage = lang }
                                    .padding(vertical = 8.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = label,
                                    color = if (isSelected) DeepMidnight else GalacticWhite,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    // Consent disclaimer screen
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { consented = !consented },
                        verticalAlignment = Alignment.Top
                    ) {
                        Checkbox(
                            checked = consented,
                            onCheckedChange = { consented = it },
                            colors = CheckboxDefaults.colors(
                                checkedColor = CelestialGold,
                                uncheckedColor = SpaceLavender
                            ),
                            modifier = Modifier.testTag("consent_checkbox")
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "I consent to receiving AI-generated astrological interpretations and reports. I understand these insights are for guidance and entertainment purposes only.",
                            fontSize = 11.sp,
                            color = SpaceLavender,
                            lineHeight = 16.sp
                        )
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    Button(
                        onClick = { viewModel.triggerOtpSend(name, phone) },
                        enabled = name.isNotBlank() && phone.isNotBlank() && consented && !isVerifying,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp)
                            .testTag("send_otp_button"),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = CelestialGold,
                            disabledContainerColor = Color.Gray.copy(alpha = 0.3f)
                        ),
                        shape = RoundedCornerShape(25.dp)
                    ) {
                        if (isVerifying) {
                            CircularProgressIndicator(modifier = Modifier.size(24.dp), color = DeepMidnight)
                        } else {
                            Text("SEND SECURITY OTP", color = DeepMidnight, fontWeight = FontWeight.Bold)
                        }
                    }
                } else {
                    // Step 2: Input Simulated OTP
                    Text(
                        text = "We've simulated sending a security OTP to $phone. Use verification code '123456' to authorize.",
                        color = SpaceLavender,
                        fontSize = 12.sp,
                        textAlign = TextAlign.Center,
                        lineHeight = 18.sp
                    )
                    Spacer(modifier = Modifier.height(16.dp))

                    OutlinedTextField(
                        value = otpCode,
                        onValueChange = { otpCode = it },
                        label = { Text("Enter 6-Digit OTP", color = SpaceLavender) },
                        leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = CelestialGold) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("otp_code_input"),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = CelestialGold,
                            unfocusedBorderColor = SpaceLavender.copy(alpha = 0.5f),
                            focusedLabelColor = CelestialGold,
                            unfocusedLabelColor = SpaceLavender,
                            focusedTextColor = GalacticWhite,
                            unfocusedTextColor = GalacticWhite
                        ),
                        singleLine = true
                    )

                    Spacer(modifier = Modifier.height(24.dp))

                    Button(
                        onClick = { viewModel.verifyOtpAndLogin(name, phone, otpCode, consented, selectedLanguage) },
                        enabled = otpCode.length >= 4 && !isVerifying,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp)
                            .testTag("verify_otp_button"),
                        colors = ButtonDefaults.buttonColors(containerColor = CelestialGold),
                        shape = RoundedCornerShape(25.dp)
                    ) {
                        if (isVerifying) {
                            CircularProgressIndicator(modifier = Modifier.size(24.dp), color = DeepMidnight)
                        } else {
                            Text("VERIFY & LOG IN", color = DeepMidnight, fontWeight = FontWeight.Bold)
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    TextButton(onClick = { viewModel.logOut() }) {
                        Text("Back / Reset Number", color = CelestialGold)
                    }
                }
            }
        }
    }
}

// --- SCREEN 2: Astrologer Selection Screen ---
@Composable
fun AstrologerListScreen(viewModel: AstrologyViewModel) {
    val astrologers by viewModel.astrologers.collectAsState()
    val userProfile by viewModel.userProfile.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.refreshAstrologers()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // App Welcome & Profile Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column {
                Text(
                    text = "Namaste, ${userProfile?.name ?: "Seeker"}",
                    fontSize = 24.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = CelestialGold
                )
                Text(
                    text = "Select an AI Guide to reveal your celestial path",
                    fontSize = 12.sp,
                    color = SpaceLavender
                )
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                NotificationBellIcon(viewModel = viewModel)
                Spacer(modifier = Modifier.width(12.dp))
                CelestialBadge(symbol = "✨", size = 46)
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Astrologers list
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                VedicPanchangComponent(viewModel = viewModel)
            }
            item {
                InAppMarketingComponent(viewModel = viewModel)
            }
            item {
                DailyHoroscopeComponent(viewModel = viewModel)
            }
            items(astrologers) { astrologer ->
                AstrologerCard(astrologer = astrologer, onSelect = { viewModel.selectAstrologer(astrologer) })
            }
            item {
                Spacer(modifier = Modifier.height(8.dp))
                AstroFaqComponent(viewModel = viewModel)
                Spacer(modifier = Modifier.height(24.dp))
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AstrologerCard(
    astrologer: Astrologer,
    onSelect: () -> Unit
) {
    Card(
        onClick = onSelect,
        colors = CardDefaults.cardColors(containerColor = SoftPlum.copy(alpha = 0.85f)),
        border = BorderStroke(1.dp, CelestialGold.copy(alpha = 0.25f)),
        shape = RoundedCornerShape(16.dp),
        modifier = Modifier
            .fillMaxWidth()
            .testTag("astrologer_card_${astrologer.id}")
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Left: Icon Badge
            CelestialBadge(symbol = astrologer.iconSymbol, size = 56)

            Spacer(modifier = Modifier.width(16.dp))

            // Right: Content
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = astrologer.name,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = GalacticWhite
                    )
                    Text(
                        text = "₹${astrologer.price}",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.ExtraBold,
                        color = CelestialGold
                    )
                }

                Text(
                    text = astrologer.specialty,
                    fontSize = 12.sp,
                    color = CelestialGold,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(top = 2.dp)
                )

                // Sub-labels for Languages and Style
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = "🗣️ ${astrologer.languages.joinToString(", ")}",
                        fontSize = 10.sp,
                        color = SpaceLavender
                    )
                    Text(
                        text = "📜 ${astrologer.style}",
                        fontSize = 10.sp,
                        color = SpaceLavender
                    )
                }

                Text(
                    text = astrologer.bio,
                    style = MaterialTheme.typography.bodySmall,
                    color = SpaceLavender.copy(alpha = 0.8f),
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(top = 6.dp)
                )

                // Accrued real rating footer
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    // Rating
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Filled.Star,
                            contentDescription = "Rating",
                            tint = CelestialGold,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = if (astrologer.averageRating != null) {
                                String.format(Locale.US, "%.1f", astrologer.averageRating)
                            } else "New",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = GalacticWhite
                        )
                        if (astrologer.totalSessions > 0) {
                            Text(
                                text = " (${astrologer.totalSessions} sessions)",
                                fontSize = 11.sp,
                                color = SpaceLavender
                            )
                        }
                    }

                    // Strict AI Badge to avoid user deception
                    Row(
                        modifier = Modifier
                            .background(Color.Black.copy(alpha = 0.4f), RoundedCornerShape(4.dp))
                            .padding(horizontal = 6.dp, vertical = 2.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Android,
                            contentDescription = "AI Generated",
                            tint = SpaceLavender,
                            modifier = Modifier.size(10.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "AI Astrologer",
                            fontSize = 9.sp,
                            color = SpaceLavender,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }
        }
    }
}

// --- SCREEN 3: Detail Intake Form Screen ---
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun IntakeFormScreen(viewModel: AstrologyViewModel) {
    val astrologer by viewModel.selectedAstrologer.collectAsState()

    var gender by remember { mutableStateOf("Male") }
    var dob by remember { mutableStateOf("") }
    var tob by remember { mutableStateOf("") }
    var pob by remember { mutableStateOf("") }
    var question by remember { mutableStateOf("") }

    // Partner details for Marriage Matching
    var partnerName by remember { mutableStateOf("") }
    var partnerDob by remember { mutableStateOf("") }
    var partnerTob by remember { mutableStateOf("") }
    var partnerPob by remember { mutableStateOf("") }

    val context = LocalContext.current
    val calendar = Calendar.getInstance()

    // Date Picker Dialog
    val datePickerDialog = DatePickerDialog(
        context,
        { _, year, month, dayOfMonth ->
            dob = "$year-${month + 1}-$dayOfMonth"
        },
        calendar.get(Calendar.YEAR),
        calendar.get(Calendar.MONTH),
        calendar.get(Calendar.DAY_OF_MONTH)
    )

    // Time Picker Dialog
    val timePickerDialog = TimePickerDialog(
        context,
        { _, hourOfDay, minute ->
            tob = String.format(Locale.US, "%02d:%02d", hourOfDay, minute)
        },
        calendar.get(Calendar.HOUR_OF_DAY),
        calendar.get(Calendar.MINUTE),
        true
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        // Back Button
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = { viewModel.navigateBack() }) {
                Icon(imageVector = Icons.Filled.ArrowBack, contentDescription = "Back", tint = CelestialGold)
            }
            Text("Enter Consultation Details", style = MaterialTheme.typography.titleMedium, color = GalacticWhite)
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Selected Astrologer Short Info Banner
        astrologer?.let { ast ->
            Card(
                colors = CardDefaults.cardColors(containerColor = SoftPlum),
                border = BorderStroke(1.dp, CelestialGold.copy(alpha = 0.2f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    CelestialBadge(symbol = ast.iconSymbol, size = 42)
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(text = ast.name, fontWeight = FontWeight.Bold, color = GalacticWhite)
                        Text(text = ast.specialty, fontSize = 11.sp, color = CelestialGold)
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Birth Info Form Card
        Card(
            colors = CardDefaults.cardColors(containerColor = SoftPlum.copy(alpha = 0.5f)),
            border = BorderStroke(1.dp, SpaceLavender.copy(alpha = 0.1f)),
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(text = "Your Birth Details", color = CelestialGold, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                Spacer(modifier = Modifier.height(12.dp))

                // Gender selector
                Text(text = "Gender Selection", color = SpaceLavender, fontSize = 12.sp)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    listOf("Male", "Female", "Other").forEach { option ->
                        FilterChip(
                            selected = gender == option,
                            onClick = { gender = option },
                            label = { Text(option) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = CelestialGold,
                                selectedLabelColor = DeepMidnight,
                                containerColor = SoftPlum,
                                labelColor = SpaceLavender
                            ),
                            modifier = Modifier.weight(1f)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Date of Birth Field
                OutlinedTextField(
                    value = dob,
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Date of Birth", color = SpaceLavender) },
                    trailingIcon = {
                        IconButton(onClick = { datePickerDialog.show() }) {
                            Icon(Icons.Filled.DateRange, contentDescription = "Select Date", tint = CelestialGold)
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { datePickerDialog.show() }
                        .testTag("dob_input"),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = GalacticWhite,
                        unfocusedTextColor = GalacticWhite,
                        focusedBorderColor = CelestialGold,
                        unfocusedBorderColor = SpaceLavender.copy(alpha = 0.3f)
                    )
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Time of Birth Field
                OutlinedTextField(
                    value = tob,
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Time of Birth (IST/Local)", color = SpaceLavender) },
                    trailingIcon = {
                        IconButton(onClick = { timePickerDialog.show() }) {
                            Icon(Icons.Filled.AccessTime, contentDescription = "Select Time", tint = CelestialGold)
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { timePickerDialog.show() }
                        .testTag("tob_input"),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = GalacticWhite,
                        unfocusedTextColor = GalacticWhite,
                        focusedBorderColor = CelestialGold,
                        unfocusedBorderColor = SpaceLavender.copy(alpha = 0.3f)
                    )
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Place of birth (Geocoding simulation)
                var pLat by remember { mutableStateOf("") }
                var pLon by remember { mutableStateOf("") }
                
                OutlinedTextField(
                    value = pob,
                    onValueChange = {
                        pob = it
                        // Simulate geocoding automatically for lat/long visual accuracy!
                        val seed = it.lowercase().hashCode()
                        if (it.length > 3) {
                            val r = java.util.Random(seed.toLong())
                            val lat = 8.0 + r.nextFloat() * 28.0 // Latitudes within India
                            val lon = 68.0 + r.nextFloat() * 29.0 // Longitudes within India
                            pLat = String.format(Locale.US, "%.4f° N", lat)
                            pLon = String.format(Locale.US, "%.4f° E", lon)
                        } else {
                            pLat = ""
                            pLon = ""
                        }
                    },
                    label = { Text("Place of Birth (City, State/Country)", color = SpaceLavender) },
                    trailingIcon = { Icon(Icons.Filled.LocationOn, contentDescription = null, tint = CelestialGold) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("pob_input"),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = GalacticWhite,
                        unfocusedTextColor = GalacticWhite,
                        focusedBorderColor = CelestialGold,
                        unfocusedBorderColor = SpaceLavender.copy(alpha = 0.3f)
                    ),
                    singleLine = true
                )

                if (pLat.isNotEmpty()) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 4.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(text = "🛰️ Lat: $pLat", color = CelestialGold, fontSize = 10.sp)
                        Text(text = "Lon: $pLon", color = CelestialGold, fontSize = 10.sp)
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Free text question field
                OutlinedTextField(
                    value = question,
                    onValueChange = { question = it },
                    label = { Text("What would you like to ask the stars?", color = SpaceLavender) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(110.dp)
                        .testTag("question_input"),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = GalacticWhite,
                        unfocusedTextColor = GalacticWhite,
                        focusedBorderColor = CelestialGold,
                        unfocusedBorderColor = SpaceLavender.copy(alpha = 0.3f)
                    ),
                    maxLines = 4
                )
            }
        }

        // --- PARTNER DETAILS ACCORDION FOR MARRIAGE MATCHING ---
        if (astrologer?.specialty == "Marriage Matching") {
            Spacer(modifier = Modifier.height(20.dp))
            Card(
                colors = CardDefaults.cardColors(containerColor = SoftPlum.copy(alpha = 0.6f)),
                border = BorderStroke(1.dp, AstralRose.copy(alpha = 0.25f)),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(text = "💑 Partner's Birth Details", color = AstralRose, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        Spacer(modifier = Modifier.width(8.dp))
                        Icon(Icons.Filled.Favorite, contentDescription = null, tint = AstralRose, modifier = Modifier.size(18.dp))
                    }
                    Spacer(modifier = Modifier.height(12.dp))

                    OutlinedTextField(
                        value = partnerName,
                        onValueChange = { partnerName = it },
                        label = { Text("Partner's Name", color = SpaceLavender) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("partner_name_input"),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = GalacticWhite,
                            unfocusedTextColor = GalacticWhite,
                            focusedBorderColor = AstralRose,
                            unfocusedBorderColor = SpaceLavender.copy(alpha = 0.3f)
                        ),
                        singleLine = true
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    val partnerDatePicker = DatePickerDialog(
                        context,
                        { _, year, month, dayOfMonth -> partnerDob = "$year-${month + 1}-$dayOfMonth" },
                        calendar.get(Calendar.YEAR) - 2,
                        calendar.get(Calendar.MONTH),
                        calendar.get(Calendar.DAY_OF_MONTH)
                    )

                    OutlinedTextField(
                        value = partnerDob,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Partner's DOB", color = SpaceLavender) },
                        trailingIcon = {
                            IconButton(onClick = { partnerDatePicker.show() }) {
                                Icon(Icons.Filled.DateRange, contentDescription = "Select Date", tint = AstralRose)
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { partnerDatePicker.show() }
                            .testTag("partner_dob_input"),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = GalacticWhite,
                            unfocusedTextColor = GalacticWhite,
                            focusedBorderColor = AstralRose,
                            unfocusedBorderColor = SpaceLavender.copy(alpha = 0.3f)
                        )
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    val partnerTimePicker = TimePickerDialog(
                        context,
                        { _, hour, minute -> partnerTob = String.format(Locale.US, "%02d:%02d", hour, minute) },
                        calendar.get(Calendar.HOUR_OF_DAY),
                        calendar.get(Calendar.MINUTE),
                        true
                    )

                    OutlinedTextField(
                        value = partnerTob,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Partner's TOB", color = SpaceLavender) },
                        trailingIcon = {
                            IconButton(onClick = { partnerTimePicker.show() }) {
                                Icon(Icons.Filled.AccessTime, contentDescription = "Select Time", tint = AstralRose)
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { partnerTimePicker.show() }
                            .testTag("partner_tob_input"),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = GalacticWhite,
                            unfocusedTextColor = GalacticWhite,
                            focusedBorderColor = AstralRose,
                            unfocusedBorderColor = SpaceLavender.copy(alpha = 0.3f)
                        )
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    OutlinedTextField(
                        value = partnerPob,
                        onValueChange = { partnerPob = it },
                        label = { Text("Partner's Place of Birth", color = SpaceLavender) },
                        trailingIcon = { Icon(Icons.Filled.LocationOn, contentDescription = null, tint = AstralRose) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("partner_pob_input"),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = GalacticWhite,
                            unfocusedTextColor = GalacticWhite,
                            focusedBorderColor = AstralRose,
                            unfocusedBorderColor = SpaceLavender.copy(alpha = 0.3f)
                        ),
                        singleLine = true
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        VedicNatalChartVisualizer(
            dob = dob,
            tob = tob,
            pob = pob,
            modifier = Modifier.fillMaxWidth().testTag("live_chart_preview")
        )

        Spacer(modifier = Modifier.height(28.dp))

        // Submit Button
        val isButtonEnabled = dob.isNotBlank() && tob.isNotBlank() && pob.isNotBlank() && question.isNotBlank() &&
                (astrologer?.specialty != "Marriage Matching" || (partnerName.isNotBlank() && partnerDob.isNotBlank() && partnerTob.isNotBlank() && partnerPob.isNotBlank()))

        Button(
            onClick = {
                viewModel.submitIntakeForm(
                    gender = gender,
                    dob = dob,
                    tob = tob,
                    pob = pob,
                    question = question,
                    partnerName = if (astrologer?.specialty == "Marriage Matching") partnerName else null,
                    partnerDob = if (astrologer?.specialty == "Marriage Matching") partnerDob else null,
                    partnerTob = if (astrologer?.specialty == "Marriage Matching") partnerTob else null,
                    partnerPob = if (astrologer?.specialty == "Marriage Matching") partnerPob else null
                )
            },
            enabled = isButtonEnabled,
            modifier = Modifier
                .fillMaxWidth()
                .height(54.dp)
                .navigationBarsPadding()
                .testTag("analyze_chart_button"),
            colors = ButtonDefaults.buttonColors(
                containerColor = CelestialGold,
                disabledContainerColor = Color.Gray.copy(alpha = 0.3f)
            ),
            shape = RoundedCornerShape(27.dp)
        ) {
            Text(text = "ANALYZE CHART & CONSULT", color = DeepMidnight, fontWeight = FontWeight.Bold, fontSize = 16.sp)
        }
    }
}

// --- SCREEN 4: Suspense / Analysis Screen ---
@Composable
fun SuspenseScreen(viewModel: AstrologyViewModel) {
    val text by viewModel.suspenseText.collectAsState()

    // Breathing pulse scale animation for loading state
    val infiniteTransition = rememberInfiniteTransition(label = "breathing")
    val scale by infiniteTransition.animateFloat(
        initialValue = 0.85f,
        targetValue = 1.15f,
        animationSpec = infiniteRepeatable(
            animation = tween(2000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse"
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier.size(240.dp)
        ) {
            // Programmatic glowing outer rings
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .alpha(0.15f)
                    .clip(CircleShape)
                    .background(CelestialGold)
            )
            Box(
                modifier = Modifier
                    .size((200 * scale).dp)
                    .alpha(0.3f)
                    .clip(CircleShape)
                    .border(2.dp, CelestialGold, CircleShape)
            )

            // Inner mandala icon
            CelestialBadge(symbol = "🔮", size = 100)
        }

        Spacer(modifier = Modifier.height(40.dp))

        Text(
            text = "Consulting the Heavens",
            fontSize = 26.sp,
            fontWeight = FontWeight.Bold,
            color = CelestialGold,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(12.dp))

        // Animated cycling text
        AnimatedContent(
            targetState = text,
            transitionSpec = {
                slideInVertically { height -> height } + fadeIn() togetherWith slideOutVertically { height -> -height } + fadeOut()
            },
            label = "textCycle"
        ) { cyclingText ->
            Text(
                text = cyclingText,
                style = MaterialTheme.typography.bodyLarge,
                color = GalacticWhite,
                textAlign = TextAlign.Center,
                fontStyle = FontStyle.Italic,
                fontWeight = FontWeight.Medium,
                modifier = Modifier.fillMaxWidth()
            )
        }

        Spacer(modifier = Modifier.height(24.dp))
        LinearProgressIndicator(
            modifier = Modifier
                .width(160.dp)
                .clip(CircleShape),
            color = CelestialGold,
            trackColor = SoftPlum
        )
    }
}

// --- SCREEN 5: Paywall Reveal Screen ---
@Composable
fun PaywallScreen(viewModel: AstrologyViewModel) {
    val activeSession by viewModel.activeSession.collectAsState()
    val astrologer by viewModel.selectedAstrologer.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .verticalScroll(rememberScrollState())
    ) {
        // Back Button
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = { viewModel.navigateBack() }) {
                Icon(imageVector = Icons.Filled.ArrowBack, contentDescription = "Back", tint = CelestialGold)
            }
            Text("Your Celestial Timeline", style = MaterialTheme.typography.titleMedium, color = GalacticWhite)
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Locked Preview Card
        Card(
            colors = CardDefaults.cardColors(containerColor = SoftPlum.copy(alpha = 0.5f)),
            border = BorderStroke(1.dp, CelestialGold.copy(alpha = 0.2f)),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(text = "Report Generated!", color = CelestialGold, fontWeight = FontWeight.Bold)
                    Icon(imageVector = Icons.Filled.Lock, contentDescription = "Locked", tint = CelestialGold)
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Simulated Blurred report preview lines
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .blur(8.dp)
                ) {
                    Text(text = "Lagna Lord is strongly placed in the 10th House, signifying massive professional expansion.", color = GalacticWhite, fontSize = 14.sp)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(text = "Rahu's alignment with the 9th lord brings unexpected settlement and travels abroad.", color = GalacticWhite, fontSize = 14.sp)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(text = "Starting from September 2026, the Jupiter Mahadasha triggers highly favorable financial partnerships.", color = GalacticWhite, fontSize = 14.sp)
                }
            }
        }

        Spacer(modifier = Modifier.height(28.dp))

        // Paywall Offer Callout Card
        Card(
            colors = CardDefaults.cardColors(containerColor = SoftPlum.copy(alpha = 0.9f)),
            border = BorderStroke(1.5.dp, CelestialGold),
            shape = RoundedCornerShape(20.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                CelestialBadge(symbol = astrologer?.iconSymbol ?: "🔮", size = 68)
                Spacer(modifier = Modifier.height(12.dp))
                
                Text(
                    text = "Unlock Your Complete PDF Consultation",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = CelestialGold,
                    textAlign = TextAlign.Center
                )
                
                Text(
                    text = "Consultation with ${activeSession?.astrologerName ?: "your chosen guide"}",
                    fontSize = 13.sp,
                    color = SpaceLavender,
                    modifier = Modifier.padding(top = 4.dp, bottom = 16.dp)
                )

                HorizontalDivider(color = CelestialGold.copy(alpha = 0.2f))

                Spacer(modifier = Modifier.height(16.dp))

                // Bullet points of what is unlocked
                listOf(
                    "📊 Comprehensive Birth Chart (Lagna & Kundli Summary)",
                    "🔮 Deep, multi-topic specialized predictions",
                    "🎨 Harmonious Lucky Number, Color, and favorable directions",
                    "📥 Printable high-fidelity PDF Consultation Document",
                    "💬 One FREE complex follow-up question included!"
                ).forEach { bullet ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(text = bullet, color = GalacticWhite, fontSize = 13.sp, lineHeight = 18.sp)
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Price & Pay Button
                Text(
                    text = "Total Session Price:",
                    fontSize = 12.sp,
                    color = SpaceLavender
                )
                Text(
                    text = "₹${activeSession?.price ?: 0}",
                    fontSize = 36.sp,
                    fontWeight = FontWeight.Black,
                    color = CelestialGold,
                    modifier = Modifier.padding(bottom = 16.dp)
                )

                Button(
                    onClick = { viewModel.triggerPlayBilling() },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp)
                        .testTag("pay_button"),
                    colors = ButtonDefaults.buttonColors(containerColor = CelestialGold),
                    shape = RoundedCornerShape(28.dp)
                ) {
                    Text(text = "PAY TO UNLOCK REPORT", color = DeepMidnight, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                }

                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Secured via Google Play Billing. Sandbox Mode active.",
                    fontSize = 10.sp,
                    color = SpaceLavender.copy(alpha = 0.6f)
                )

                Spacer(modifier = Modifier.height(24.dp))
                HorizontalDivider(color = CelestialGold.copy(alpha = 0.15f))
                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = "OR SUBSCRIBE FOR EXCLUSIVE BENEFITS 🌟",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = CelestialGold,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )
                
                Text(
                    text = "Activate a premium tier to unlock this consultation instantly and receive future consultations for free or at exclusive subscriber rates!",
                    fontSize = 11.sp,
                    color = SpaceLavender,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(top = 4.dp, bottom = 12.dp)
                )

                viewModel.subscriptionTiers.forEach { tier ->
                    SubscriptionTierCard(
                        tier = tier,
                        isSelected = false,
                        onSubscribeClick = { viewModel.selectSubscription(tier) }
                    )
                }
            }
        }
    }
}

// --- SCREEN 6: Unlocked Report View & Follow-Up Q&A ---
@Composable
fun ReportViewScreen(viewModel: AstrologyViewModel) {
    val activeSession by viewModel.activeSession.collectAsState()
    val isSubmittingFollowUp by viewModel.isSubmittingFollowUp.collectAsState()
    val selectedAstrologer by viewModel.selectedAstrologer.collectAsState()
    val translatedReportText by viewModel.translatedReportText.collectAsState()
    val isTranslatingReport by viewModel.isTranslatingReport.collectAsState()

    val context = LocalContext.current
    var followUpText by remember { mutableStateOf("") }
    var userRating by remember { mutableStateOf(0) }

    val reportText = activeSession?.reportText ?: "No report text generated."
    val displayReportText = translatedReportText ?: reportText

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .verticalScroll(rememberScrollState())
    ) {
        // Top actions: Back, Title, Save PDF
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = { 
                    viewModel.clearReportTranslation()
                    viewModel.navigateTo(Screen.AstrologerList) 
                }) {
                    Icon(imageVector = Icons.Filled.Close, contentDescription = "Close", tint = CelestialGold)
                }
                Text("Your Consultation", style = MaterialTheme.typography.titleMedium, color = GalacticWhite)
            }

            // PDF Download button! Fully functional!
            IconButton(
                onClick = { viewModel.downloadReportAsPdf(context) },
                modifier = Modifier.testTag("download_pdf_button")
            ) {
                Icon(imageVector = Icons.Filled.Download, contentDescription = "Download PDF", tint = CelestialGold)
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Astrologer Banner Summary
        Card(
            colors = CardDefaults.cardColors(containerColor = SoftPlum),
            border = BorderStroke(1.dp, CelestialGold.copy(alpha = 0.2f)),
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                CelestialBadge(symbol = selectedAstrologer?.iconSymbol ?: "🔮", size = 48)
                Spacer(modifier = Modifier.width(16.dp))
                Column {
                    Text(text = activeSession?.astrologerName ?: "Vedic Astrologer", fontWeight = FontWeight.Bold, color = GalacticWhite)
                    Text(text = activeSession?.specialty ?: "General Reading", fontSize = 12.sp, color = CelestialGold)
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        activeSession?.let { session ->
            VedicNatalChartVisualizer(
                dob = session.dob,
                tob = session.tob,
                pob = session.pob,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 20.dp)
                    .testTag("report_final_chart")
            )
        }

        // Dynamic Translation Selector Panel
        Card(
            colors = CardDefaults.cardColors(containerColor = SoftPlum),
            border = BorderStroke(1.dp, CelestialGold.copy(alpha = 0.3f)),
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 16.dp)
                .testTag("report_translation_panel")
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "🌐 Translate consultation dynamically / अनुवाद करें:",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = CelestialGold
                )
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    listOf("Hinglish", "Hindi", "English", "Tamil", "Telugu").forEach { targetLang ->
                        val label = when (targetLang) {
                            "Hinglish" -> "Hinglish"
                            "Hindi" -> "हिन्दी"
                            else -> targetLang
                        }
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(8.dp))
                                .background(DeepMidnight)
                                .border(1.dp, CelestialGold.copy(alpha = 0.2f), RoundedCornerShape(8.dp))
                                .clickable { viewModel.translateReport(targetLang) }
                                .padding(vertical = 8.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(label, fontSize = 11.sp, color = GalacticWhite, fontWeight = FontWeight.Bold)
                        }
                    }
                }
                if (translatedReportText != null) {
                    Spacer(modifier = Modifier.height(12.dp))
                    TextButton(
                        onClick = { viewModel.clearReportTranslation() },
                        modifier = Modifier.align(Alignment.End)
                    ) {
                        Text("Reset to Original", color = AstralRose, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        if (isTranslatingReport) {
            Box(
                modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = CelestialGold, modifier = Modifier.size(24.dp))
            }
            Spacer(modifier = Modifier.height(8.dp))
        }

        // Full report content card
        Card(
            colors = CardDefaults.cardColors(containerColor = SoftPlum.copy(alpha = 0.4f)),
            border = BorderStroke(1.dp, SpaceLavender.copy(alpha = 0.15f)),
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Text(
                    text = "Vedic Reading & Kundli Analysis",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = CelestialGold
                )
                Spacer(modifier = Modifier.height(16.dp))

                // Beautifully formats the markdown output with scrollable/wrap text
                Text(
                    text = displayReportText,
                    fontSize = 14.sp,
                    color = GalacticWhite,
                    lineHeight = 22.sp,
                    style = MaterialTheme.typography.bodyMedium
                )
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // --- SESSION RATING (Dynamic rating accrual from actual sessions!) ---
        Card(
            colors = CardDefaults.cardColors(containerColor = SoftPlum),
            border = BorderStroke(1.dp, CelestialGold.copy(alpha = 0.15f)),
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = if (activeSession?.rating == null) "Rate your consultation session" else "Your Rating",
                    color = CelestialGold,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp
                )
                Spacer(modifier = Modifier.height(10.dp))

                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    val currentRating = activeSession?.rating ?: userRating
                    (1..5).forEach { star ->
                        Icon(
                            imageVector = if (star <= currentRating) Icons.Filled.Star else Icons.Outlined.Star,
                            contentDescription = "Star $star",
                            tint = if (star <= currentRating) CelestialGold else Color.Gray,
                            modifier = Modifier
                                .size(32.dp)
                                .clickable(enabled = activeSession?.rating == null) {
                                    userRating = star
                                    viewModel.rateAstrologerSession(star)
                                }
                                .testTag("star_$star")
                        )
                    }
                }

                if (activeSession?.rating != null) {
                    Text(
                        text = "Thank you! Your feedback helps other seekers and refines our astrologer standings.",
                        color = SpaceLavender,
                        fontSize = 11.sp,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(top = 8.dp)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // --- ONE FREE FOLLOW-UP QUESTION ---
        Card(
            colors = CardDefaults.cardColors(containerColor = SoftPlum.copy(alpha = 0.85f)),
            border = BorderStroke(1.5.dp, AstralRose.copy(alpha = 0.3f)),
            shape = RoundedCornerShape(20.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(imageVector = Icons.Filled.Chat, contentDescription = null, tint = AstralRose)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Included Follow-Up Question",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = AstralRose
                    )
                }
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "You are entitled to ask exactly 1 follow-up question referencing this chart. This is included in your consultation fee.",
                    fontSize = 12.sp,
                    color = SpaceLavender
                )

                Spacer(modifier = Modifier.height(16.dp))

                if (activeSession?.followUpQuestion == null) {
                    // Ask field
                    OutlinedTextField(
                        value = followUpText,
                        onValueChange = { followUpText = it },
                        label = { Text("Ask your follow-up...", color = SpaceLavender) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(100.dp)
                            .testTag("follow_up_input"),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = GalacticWhite,
                            unfocusedTextColor = GalacticWhite,
                            focusedBorderColor = AstralRose,
                            unfocusedBorderColor = SpaceLavender.copy(alpha = 0.3f)
                        )
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    Button(
                        onClick = { viewModel.submitFollowUpQuestion(followUpText) },
                        enabled = followUpText.isNotBlank() && !isSubmittingFollowUp,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp)
                            .testTag("submit_follow_up_button"),
                        colors = ButtonDefaults.buttonColors(containerColor = AstralRose),
                        shape = RoundedCornerShape(24.dp)
                    ) {
                        if (isSubmittingFollowUp) {
                            CircularProgressIndicator(modifier = Modifier.size(24.dp), color = GalacticWhite)
                        } else {
                            Text("SUBMIT FOLLOW-UP", color = GalacticWhite, fontWeight = FontWeight.Bold)
                        }
                    }
                } else {
                    // Display Q&A History
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(DeepMidnight, RoundedCornerShape(12.dp))
                            .padding(14.dp)
                    ) {
                        Text(
                            text = "Your Question:",
                            color = AstralRose,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp
                        )
                        Text(
                            text = activeSession?.followUpQuestion ?: "",
                            color = GalacticWhite,
                            fontSize = 13.sp,
                            modifier = Modifier.padding(top = 4.dp, bottom = 12.dp)
                        )

                        HorizontalDivider(color = SoftPlum)

                        Text(
                            text = "Astrologer's Response:",
                            color = CelestialGold,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            modifier = Modifier.padding(top = 12.dp)
                        )
                        Text(
                            text = activeSession?.followUpResponse ?: "",
                            color = GalacticWhite,
                            fontSize = 13.sp,
                            lineHeight = 20.sp,
                            modifier = Modifier.padding(top = 4.dp)
                        )
                    }
                    
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = "🔒 Consultation closed. Buy another session for further questions.",
                        fontSize = 11.sp,
                        color = Color.Gray,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))
    }
}

// --- SCREEN 7: Consultation History Screen (My Reports) ---
@Composable
fun MyReportsScreen(viewModel: AstrologyViewModel) {
    val sessions by viewModel.allSessions.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = "My Consultations",
                fontSize = 24.sp,
                fontWeight = FontWeight.ExtraBold,
                color = CelestialGold
            )
            NotificationBellIcon(viewModel = viewModel)
        }

        if (sessions.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    CelestialBadge(symbol = "🌙", size = 64)
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(text = "No consultation logs found in stars.", color = SpaceLavender, fontSize = 14.sp)
                    Text(
                        text = "Pick an astrologer to initiate your first consultation.",
                        color = Color.Gray,
                        fontSize = 12.sp,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(start = 24.dp, end = 24.dp, top = 4.dp)
                    )
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(sessions) { session ->
                    HistoryCard(session = session, onClick = { viewModel.viewHistorySession(session) })
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HistoryCard(
    session: ReportSession,
    onClick: () -> Unit
) {
    val formatter = remember { SimpleDateFormat("dd MMM yyyy, hh:mm a", Locale.getDefault()) }
    val formattedDate = remember(session.timestamp) { formatter.format(Date(session.timestamp)) }

    Card(
        onClick = onClick,
        colors = CardDefaults.cardColors(containerColor = SoftPlum.copy(alpha = 0.75f)),
        border = BorderStroke(1.dp, if (session.isPaid) CelestialGold.copy(alpha = 0.3f) else Color.Gray.copy(alpha = 0.3f)),
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier
            .fillMaxWidth()
            .testTag("history_card_${session.id}")
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            CelestialBadge(symbol = if (session.specialty.contains("Marriage")) "💑" else "🔮", size = 42)

            Spacer(modifier = Modifier.width(16.dp))

            Column(modifier = Modifier.weight(1f)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(text = session.astrologerName, fontWeight = FontWeight.Bold, color = GalacticWhite)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .background(
                                    if (session.isPaid) Color(0xFF00C853).copy(alpha = 0.2f) else Color.Red.copy(alpha = 0.2f),
                                    RoundedCornerShape(4.dp)
                                )
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        ) {
                            Text(
                                text = if (session.isPaid) "Paid" else "Locked",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (session.isPaid) Color(0xFF00C853) else Color.Red
                            )
                        }
                    }
                }

                Text(text = session.specialty, fontSize = 11.sp, color = CelestialGold, modifier = Modifier.padding(top = 2.dp))
                Text(text = formattedDate, fontSize = 10.sp, color = SpaceLavender, modifier = Modifier.padding(top = 4.dp))
            }
        }
    }
}

// --- Subscription Tier Card Helper Composable ---
@Composable
fun SubscriptionTierCard(
    tier: SubscriptionTier,
    isSelected: Boolean = false,
    onSubscribeClick: () -> Unit
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = SoftPlum),
        border = BorderStroke(1.5.dp, if (isSelected) CelestialGold else SpaceLavender.copy(alpha = 0.15f)),
        shape = RoundedCornerShape(16.dp),
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp)
            .testTag("subscription_card_${tier.id}")
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    CelestialBadge(symbol = tier.iconSymbol, size = 36)
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        text = tier.name,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (isSelected) CelestialGold else GalacticWhite
                    )
                }
                Text(
                    text = "₹${tier.price}/${if (tier.period == "week") "wk" else if (tier.period == "month") "mo" else "yr"}",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = CelestialGold
                )
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = tier.description,
                fontSize = 11.sp,
                color = SpaceLavender,
                lineHeight = 15.sp
            )
            
            Spacer(modifier = Modifier.height(12.dp))
            HorizontalDivider(color = SpaceLavender.copy(alpha = 0.05f))
            Spacer(modifier = Modifier.height(8.dp))
            
            // Features bullet list
            tier.features.forEach { feature ->
                Row(
                    modifier = Modifier.padding(vertical = 3.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(text = "✦", color = CelestialGold, fontSize = 10.sp, modifier = Modifier.padding(end = 8.dp))
                    Text(text = feature, fontSize = 11.sp, color = GalacticWhite.copy(alpha = 0.85f))
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            Button(
                onClick = onSubscribeClick,
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (isSelected) CelestialGold.copy(alpha = 0.15f) else CelestialGold
                ),
                border = if (isSelected) BorderStroke(1.dp, CelestialGold) else null,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(42.dp)
                    .testTag("subscribe_button_${tier.id}"),
                shape = RoundedCornerShape(21.dp)
            ) {
                Text(
                    text = if (isSelected) "ACTIVE PLAN" else "SUBSCRIBE VIA GOOGLE PLAY",
                    fontWeight = FontWeight.Bold,
                    color = if (isSelected) CelestialGold else DeepMidnight,
                    fontSize = 12.sp
                )
            }
        }
    }
}

// --- SCREEN 8: User Profile Screen ---
@Composable
fun ProfileScreen(viewModel: AstrologyViewModel) {
    val userProfile by viewModel.userProfile.collectAsState()
    val activeTierName = userProfile?.subscriptionTier ?: "Free"
    val isSubscribed = activeTierName != "Free"

    val sdf = remember { SimpleDateFormat("dd MMM yyyy", Locale.getDefault()) }
    val expiryDateStr = remember(userProfile?.subscriptionExpiry) {
        val expiry = userProfile?.subscriptionExpiry ?: 0L
        if (expiry > 0) sdf.format(Date(expiry)) else ""
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = "My Profile",
                fontSize = 24.sp,
                fontWeight = FontWeight.ExtraBold,
                color = CelestialGold
            )
            NotificationBellIcon(viewModel = viewModel)
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Avatar with Subscriber Badge
        Box(contentAlignment = Alignment.BottomEnd) {
            CelestialBadge(symbol = if (isSubscribed) "🧙✨" else "🧘", size = 96)
            if (isSubscribed) {
                Box(
                    modifier = Modifier
                        .background(CelestialGold, RoundedCornerShape(8.dp))
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                ) {
                    Text("PRO", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = DeepMidnight)
                }
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = userProfile?.name ?: "Seeker",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = GalacticWhite
        )
        Text(
            text = userProfile?.phone ?: "",
            style = MaterialTheme.typography.bodyMedium,
            color = SpaceLavender
        )

        Spacer(modifier = Modifier.height(24.dp))

        // --- ACTIVE SUBSCRIPTION STATE DASHBOARD ---
        Text(
            text = "MY SUBSCRIPTION STATUS",
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            color = CelestialGold,
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 8.dp)
        )

        if (isSubscribed) {
            // Golden Subscription Card
            Card(
                colors = CardDefaults.cardColors(containerColor = SoftPlum),
                border = BorderStroke(2.dp, CelestialGold),
                shape = RoundedCornerShape(20.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("active_subscription_dashboard")
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = when (activeTierName) {
                                    "Nakshatra Bronze" -> "🥉"
                                    "Rashifal Silver" -> "🥈"
                                    else -> "🥇"
                                },
                                fontSize = 24.sp
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = activeTierName,
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = CelestialGold
                            )
                        }
                        Box(
                            modifier = Modifier
                                .background(Color(0xFF0F9D58).copy(alpha = 0.2f), RoundedCornerShape(4.dp))
                                .padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Text("ACTIVE", color = Color(0xFF0F9D58), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = "Your membership is active and verified by Google Play. Enjoy unlimited or heavily discounted consultations with specialized AI Astrologers.",
                        fontSize = 12.sp,
                        color = SpaceLavender,
                        lineHeight = 16.sp
                    )
                    
                    if (expiryDateStr.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = "Next Renewal Date: $expiryDateStr",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = GalacticWhite
                        )
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    // Cancel Subscription button
                    OutlinedButton(
                        onClick = { viewModel.cancelSubscription() },
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.Red),
                        border = BorderStroke(1.dp, Color.Red.copy(alpha = 0.4f)),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(40.dp)
                            .testTag("cancel_subscription_button"),
                        shape = RoundedCornerShape(20.dp)
                    ) {
                        Text("CANCEL SUBSCRIPTION (TEST)", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    }
                }
            }
        } else {
            // Free Tier Callout
            Card(
                colors = CardDefaults.cardColors(containerColor = SoftPlum.copy(alpha = 0.4f)),
                border = BorderStroke(1.dp, SpaceLavender.copy(alpha = 0.1f)),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "Current Plan: Free Seeker Tier 🌙",
                        fontWeight = FontWeight.Bold,
                        color = GalacticWhite,
                        fontSize = 14.sp
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "You are currently paying full standard prices (₹19 - ₹199) per single report. Level up to get free consultations and unlimited cosmic guides.",
                        fontSize = 11.sp,
                        color = SpaceLavender,
                        lineHeight = 15.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // RENDER SUBSCRIPTION SELECTION LIST FOR FREE USERS
            Text(
                text = "UPGRADE TO PREMIUM CONSULTATION TIERS",
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = CelestialGold,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 4.dp)
            )

            viewModel.subscriptionTiers.forEach { tier ->
                SubscriptionTierCard(
                    tier = tier,
                    isSelected = activeTierName == tier.name,
                    onSubscribeClick = { viewModel.selectSubscription(tier) }
                )
            }
        }

        Spacer(modifier = Modifier.height(28.dp))

        // App/Policy Details
        Card(
            colors = CardDefaults.cardColors(containerColor = SoftPlum.copy(alpha = 0.5f)),
            border = BorderStroke(1.dp, SpaceLavender.copy(alpha = 0.1f)),
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Text(text = "Regulatory & Google Play Policies", color = CelestialGold, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                Spacer(modifier = Modifier.height(12.dp))

                listOf(
                    "📌 **Content Rating**: Fully compliant with PEGI 12+ / Teen guidelines for fortune-telling and guidance apps.",
                    "🛡️ **Refund Policy**: Consumables and subscriptions are eligible for full automatic refunds within 24 hours of purchase if the stars are completely misaligned.",
                    "⛔ **No Factual Guarantees**: Under Play Store developer console policy, Adi Jyotish Gurus makes no absolute claims of guaranteed prediction accuracy.",
                    "💼 **No Licensed Advice**: Astrological timings are for spiritual path assistance. They do NOT constitute professional medical, legal, or licensed financial advice."
                ).forEach { item ->
                    Text(
                        text = item,
                        fontSize = 11.sp,
                        color = SpaceLavender,
                        modifier = Modifier.padding(vertical = 4.dp),
                        lineHeight = 16.sp
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // --- REFERRAL & CELESTIAL WALLET SECTION ---
        Text(
            text = "REFERRAL & CELESTIAL WALLET",
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            color = CelestialGold,
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 16.dp, bottom = 8.dp)
        )

        Card(
            colors = CardDefaults.cardColors(containerColor = SoftPlum),
            border = BorderStroke(2.dp, CelestialGold.copy(alpha = 0.5f)),
            shape = RoundedCornerShape(20.dp),
            modifier = Modifier
                .fillMaxWidth()
                .testTag("referral_wallet_card")
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("🪙", fontSize = 24.sp)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Celestial Wallet",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = CelestialGold
                        )
                    }
                    Text(
                        text = "₹${userProfile?.walletBalance ?: 0}.00",
                        fontSize = 20.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = CelestialGold
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))
                
                Text(
                    text = "Referral Code: ADI-${(userProfile?.name ?: "Seeker").uppercase().replace(" ", "")}",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = GalacticWhite,
                    modifier = Modifier
                        .background(DeepMidnight, RoundedCornerShape(8.dp))
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                )

                Spacer(modifier = Modifier.height(10.dp))
                
                Text(
                    text = "Share your daily personalized Rashifal to earn bonus rewards! When a friend downloads the app and completes their first horoscope or plan activation, you instantly get credited 50% of their activated plan inside your celestial wallet (One-Time Cap applies). Use this balance to purchase any specialized consultation report for FREE!",
                    fontSize = 11.sp,
                    color = SpaceLavender,
                    lineHeight = 15.sp
                )

                Spacer(modifier = Modifier.height(16.dp))

                ReferralSimulationSection(viewModel = viewModel)
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // --- CONSULTATION CREDITS STORE ---
        Text(
            text = "RECHARGE CELESTIAL WALLET",
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            color = CelestialGold,
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 8.dp)
        )

        Card(
            colors = CardDefaults.cardColors(containerColor = SoftPlum),
            border = BorderStroke(1.5.dp, CelestialGold.copy(alpha = 0.5f)),
            shape = RoundedCornerShape(20.dp),
            modifier = Modifier
                .fillMaxWidth()
                .testTag("credits_store_card")
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Text(
                    text = "Add Credits via Google Play Billing",
                    fontWeight = FontWeight.Bold,
                    color = GalacticWhite,
                    fontSize = 15.sp
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Unlock any custom specialized reports or consultations immediately. Bonus credits are included automatically in larger packs!",
                    fontSize = 11.sp,
                    color = SpaceLavender,
                    lineHeight = 15.sp
                )

                Spacer(modifier = Modifier.height(16.dp))

                viewModel.creditsPacks.forEach { pack ->
                    Card(
                        colors = CardDefaults.cardColors(containerColor = DeepMidnight),
                        border = BorderStroke(1.dp, SpaceLavender.copy(alpha = 0.15f)),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 6.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(
                                modifier = Modifier.weight(1f),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = pack.iconSymbol,
                                    fontSize = 24.sp,
                                    modifier = Modifier.padding(end = 12.dp)
                                )
                                Column {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(
                                            text = pack.name,
                                            fontWeight = FontWeight.Bold,
                                            color = GalacticWhite,
                                            fontSize = 13.sp
                                        )
                                        if (pack.creditsAmount > pack.price) {
                                            val bonus = pack.creditsAmount - pack.price
                                            Spacer(modifier = Modifier.width(6.dp))
                                            Box(
                                                modifier = Modifier
                                                    .background(CelestialGold.copy(alpha = 0.2f), RoundedCornerShape(4.dp))
                                                    .padding(horizontal = 4.dp, vertical = 2.dp)
                                            ) {
                                                Text(
                                                    text = "₹$bonus BONUS",
                                                    fontSize = 8.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = CelestialGold
                                                )
                                            }
                                        }
                                    }
                                    Spacer(modifier = Modifier.height(2.dp))
                                    Text(
                                        text = pack.description,
                                        fontSize = 11.sp,
                                        color = SpaceLavender,
                                        lineHeight = 14.sp
                                    )
                                }
                            }
                            
                            Button(
                                onClick = { viewModel.selectCreditsPack(pack) },
                                colors = ButtonDefaults.buttonColors(containerColor = CelestialGold),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier
                                    .padding(start = 8.dp)
                                    .testTag("buy_pack_${pack.id}")
                            ) {
                                Text(
                                    text = "₹${pack.price}",
                                    color = DeepMidnight,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 11.sp
                                )
                            }
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // --- LANGUAGE SETTINGS & TRANSLATION ---
        Text(
            text = "VEDIC LOCALIZATION & PREFERENCES",
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            color = CelestialGold,
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 8.dp)
        )

        Card(
            colors = CardDefaults.cardColors(containerColor = SoftPlum),
            border = BorderStroke(1.5.dp, CelestialGold.copy(alpha = 0.5f)),
            shape = RoundedCornerShape(20.dp),
            modifier = Modifier
                .fillMaxWidth()
                .testTag("language_settings_card")
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("🌐", fontSize = 24.sp)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Preferred Language",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = CelestialGold
                    )
                }

                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "Aap apna language change kar sakte hain. All future reports, daily horoscopes, and expert consultations will be generated dynamically in your chosen language.",
                    fontSize = 11.sp,
                    color = SpaceLavender,
                    lineHeight = 16.sp
                )

                Spacer(modifier = Modifier.height(16.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    listOf("Hinglish", "Hindi", "English").forEach { lang ->
                        val currentLang = userProfile?.preferredLanguage ?: "Hinglish"
                        val isSelected = currentLang.equals(lang, ignoreCase = true)
                        val label = when (lang) {
                            "Hinglish" -> "Hinglish"
                            "Hindi" -> "हिन्दी"
                            else -> "English"
                        }
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .padding(horizontal = 4.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(if (isSelected) CelestialGold else DeepMidnight)
                                .border(1.dp, if (isSelected) CelestialGold else SpaceLavender.copy(alpha = 0.2f), RoundedCornerShape(8.dp))
                                .clickable { viewModel.updateLanguage(lang) }
                                .padding(vertical = 10.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = label,
                                color = if (isSelected) DeepMidnight else GalacticWhite,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Logout Button
        Button(
            onClick = { viewModel.logOut() },
            modifier = Modifier
                .fillMaxWidth()
                .height(48.dp)
                .testTag("logout_button"),
            colors = ButtonDefaults.buttonColors(containerColor = Color.Red.copy(alpha = 0.8f)),
            shape = RoundedCornerShape(24.dp)
        ) {
            Text(text = "LOG OUT FROM ASTROLOGY", color = Color.White, fontWeight = FontWeight.Bold)
        }

        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = "Adi Jyotish Gurus v1.0.0 (Simulated Google Play Sandbox)",
            fontSize = 9.sp,
            color = Color.Gray
        )
    }
}

// ==========================================
// --- VEDIC NATAL CHART CALCULATION & VISUALIZATION ---
// ==========================================

data class BirthChartData(
    val lagnaSign: Int,
    val lagnaSignName: String,
    val houseSigns: List<Int>,
    val planetPositions: Map<String, Int>
)

data class HousePlacement(
    val x: Float,
    val y: Float,
    val numX: Float,
    val numY: Float
)

fun calculateVedicChart(
    year: Int,
    month: Int,
    day: Int,
    hour: Int,
    minute: Int,
    latitude: Double,
    longitude: Double
): BirthChartData {
    val rashiNames = listOf(
        "Mesha (Aries)",
        "Vrishabha (Taurus)",
        "Mithuna (Gemini)",
        "Karka (Cancer)",
        "Simha (Leo)",
        "Kanya (Virgo)",
        "Tula (Libra)",
        "Vrishchika (Scorpio)",
        "Dhanu (Sagittarius)",
        "Makara (Capricorn)",
        "Kumbha (Aquarius)",
        "Meena (Pisces)"
    )

    // Calculate Day of Year
    val cal = Calendar.getInstance()
    cal.set(year, month - 1, day)
    val dayOfYear = cal.get(Calendar.DAY_OF_YEAR)

    // Reference epoch days since 2000-01-01
    val daysSince2000 = (year - 2000) * 365.25 + dayOfYear + (hour + minute / 60.0) / 24.0

    // Sun longitude
    var sunLong = ((dayOfYear - 104) * 360.0 / 365.256) % 360.0
    if (sunLong < 0) sunLong += 360.0

    // Moon longitude
    var moonLong = (180.0 + daysSince2000 * 13.1763) % 360.0
    if (moonLong < 0) moonLong += 360.0

    // Mars
    var marsLong = (120.0 + daysSince2000 * 0.524) % 360.0
    if (marsLong < 0) marsLong += 360.0

    // Mercury
    val mercuryCycle = (daysSince2000 * (360.0 / 88.0)) % 360.0
    var mercuryLong = (sunLong + 22.0 * Math.sin(Math.toRadians(mercuryCycle))) % 360.0
    if (mercuryLong < 0) mercuryLong += 360.0

    // Jupiter
    var jupiterLong = (45.0 + daysSince2000 * 0.0831) % 360.0
    if (jupiterLong < 0) jupiterLong += 360.0

    // Venus
    val venusCycle = (daysSince2000 * (360.0 / 224.7)) % 360.0
    var venusLong = (sunLong + 44.0 * Math.cos(Math.toRadians(venusCycle))) % 360.0
    if (venusLong < 0) venusLong += 360.0

    // Saturn
    var saturnLong = (220.0 + daysSince2000 * 0.03349) % 360.0
    if (saturnLong < 0) saturnLong += 360.0

    // Rahu
    var rahuLong = (340.0 - daysSince2000 * 0.0529) % 360.0
    if (rahuLong < 0) rahuLong += 360.0

    // Ketu
    val ketuLong = (rahuLong + 180.0) % 360.0

    // Local Mean Time adjustment for Ascendant
    val hoursSince6 = (hour + minute / 60.0) - 6.0
    val lonAdjustmentHours = (longitude - 82.5) * 4.0 / 60.0
    val localMeanHoursSince6 = hoursSince6 + lonAdjustmentHours

    var ascendantLong = (sunLong + localMeanHoursSince6 * 15.0) % 360.0
    if (ascendantLong < 0) ascendantLong += 360.0

    val lagnaSign = (ascendantLong / 30.0).toInt() + 1
    val lagnaSignName = rashiNames[(lagnaSign - 1) % 12]

    val houseSigns = List(12) { i ->
        ((lagnaSign + i - 1) % 12) + 1
    }

    val planets = mapOf(
        "Su" to (((sunLong / 30.0).toInt() + 1 - lagnaSign + 12) % 12) + 1,
        "Mo" to (((moonLong / 30.0).toInt() + 1 - lagnaSign + 12) % 12) + 1,
        "Ma" to (((marsLong / 30.0).toInt() + 1 - lagnaSign + 12) % 12) + 1,
        "Me" to (((mercuryLong / 30.0).toInt() + 1 - lagnaSign + 12) % 12) + 1,
        "Ju" to (((jupiterLong / 30.0).toInt() + 1 - lagnaSign + 12) % 12) + 1,
        "Ve" to (((venusLong / 30.0).toInt() + 1 - lagnaSign + 12) % 12) + 1,
        "Sa" to (((saturnLong / 30.0).toInt() + 1 - lagnaSign + 12) % 12) + 1,
        "Ra" to (((rahuLong / 30.0).toInt() + 1 - lagnaSign + 12) % 12) + 1,
        "Ke" to (((ketuLong / 30.0).toInt() + 1 - lagnaSign + 12) % 12) + 1
    )

    return BirthChartData(lagnaSign, lagnaSignName, houseSigns, planets)
}

fun parseBirthDetails(dob: String, tob: String, pob: String): BirthChartData {
    var year: Int
    var month: Int
    var day: Int
    try {
        val parts = dob.split("-")
        year = parts.getOrNull(0)?.toIntOrNull() ?: 1990
        month = parts.getOrNull(1)?.toIntOrNull() ?: 1
        day = parts.getOrNull(2)?.toIntOrNull() ?: 1
    } catch (e: Exception) {
        year = 1990
        month = 1
        day = 1
    }

    var hour: Int
    var minute: Int
    try {
        val parts = tob.split(":")
        hour = parts.getOrNull(0)?.toIntOrNull() ?: 12
        minute = parts.getOrNull(1)?.toIntOrNull() ?: 0
    } catch (e: Exception) {
        hour = 12
        minute = 0
    }

    val seed = pob.lowercase().hashCode().toLong()
    val r = java.util.Random(seed)
    val lat = if (pob.isNotBlank()) 8.0 + r.nextFloat() * 28.0 else 28.6139
    val lon = if (pob.isNotBlank()) 68.0 + r.nextFloat() * 29.0 else 77.2090

    return calculateVedicChart(year, month, day, hour, minute, lat, lon)
}

@Composable
fun VedicNatalChartVisualizer(
    dob: String,
    tob: String,
    pob: String,
    modifier: Modifier = Modifier
) {
    if (dob.isBlank() || tob.isBlank() || pob.isBlank()) {
        Card(
            colors = CardDefaults.cardColors(containerColor = SoftPlum.copy(alpha = 0.3f)),
            border = BorderStroke(1.dp, SpaceLavender.copy(alpha = 0.15f)),
            modifier = modifier.fillMaxWidth()
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "Fill in Date, Time, and Place of birth above to construct your Janam Kundli chart.",
                    color = SpaceLavender,
                    textAlign = TextAlign.Center,
                    fontSize = 12.sp,
                    fontStyle = FontStyle.Italic
                )
            }
        }
        return
    }

    val chartData = remember(dob, tob, pob) {
        parseBirthDetails(dob, tob, pob)
    }

    var selectedHouse by remember { mutableStateOf<Int?>(1) }

    val houseSignificance = remember {
        listOf(
            "Lagna/Ascendant (1st House): Core self, physical appearance, life path, health, character, and general outlook.",
            "2nd House: Speech, wealth, assets, family line, primary knowledge, and facial characteristics.",
            "3rd House: Courage, self-efforts, younger siblings, short journeys, writing, and communication abilities.",
            "4th House: Mother, emotional state, home environment, landed property, vehicles, and inner peace (Sukha).",
            "5th House: Higher intellect, past-life merits (Purvapunya), children, creativity, speculative gains, and romance.",
            "6th House: Everyday challenges, service, health, legal conflicts, enemies, debts, and daily hard work.",
            "7th House: Primary spouse, marriages, long-term partnerships, business relations, and public interaction.",
            "8th House: Longevity, deep secrets, sudden transformations, inheritance, occult wisdom, and legacy assets.",
            "9th House: Guru, father, higher education, long journeys, cosmic fortune (Bhagya), religion, and philosophy.",
            "10th House: Major career, public reputation, status, administrative powers, achievements, and professional karma.",
            "11th House: Financial gains, elder siblings, network circles, realizations of desires, and secondary sources of income.",
            "12th House: Subconscious, expenditure, sleep comforts, foreign countries, isolation, hospitals, and spiritual liberation (Moksha)."
        )
    }

    val rashiFullNames = remember {
        listOf(
            "Mesha (Aries)",
            "Vrishabha (Taurus)",
            "Mithuna (Gemini)",
            "Karka (Cancer)",
            "Simha (Leo)",
            "Kanya (Virgo)",
            "Tula (Libra)",
            "Vrishchika (Scorpio)",
            "Dhanu (Sagittarius)",
            "Makara (Capricorn)",
            "Kumbha (Aquarius)",
            "Meena (Pisces)"
        )
    }
    val rashiEmojis = remember {
        listOf("♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓")
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .background(SoftPlum.copy(alpha = 0.5f))
            .border(1.dp, CelestialGold.copy(alpha = 0.25f), RoundedCornerShape(20.dp))
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "✨ Your Sacred Janam Kundli ✨",
            style = MaterialTheme.typography.titleMedium,
            color = CelestialGold,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center
        )
        Text(
            text = "Deterministic Vedic Layout • Local Mean Time Calibration",
            fontSize = 11.sp,
            color = SpaceLavender,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 2.dp, bottom = 12.dp)
        )

        BoxWithConstraints(
            modifier = Modifier
                .fillMaxWidth(0.9f)
                .aspectRatio(1f)
                .padding(vertical = 12.dp)
        ) {
            val sizePx = minOf(maxWidth, maxHeight)

            Canvas(
                modifier = Modifier
                    .size(sizePx)
                    .background(DeepMidnight.copy(alpha = 0.6f), RoundedCornerShape(12.dp))
                    .border(2.dp, CelestialGold.copy(alpha = 0.4f), RoundedCornerShape(12.dp))
            ) {
                val w = size.width
                val h = size.height

                // Diagonals representing Vedic house intersections
                drawLine(
                    color = CelestialGold.copy(alpha = 0.25f),
                    start = Offset(0f, 0f),
                    end = Offset(w, h),
                    strokeWidth = 2.dp.toPx()
                )
                drawLine(
                    color = CelestialGold.copy(alpha = 0.25f),
                    start = Offset(w, 0f),
                    end = Offset(0f, h),
                    strokeWidth = 2.dp.toPx()
                )

                // Classic Midpoint Diamond (Sudarshana Kundli geometry)
                val path = androidx.compose.ui.graphics.Path().apply {
                    moveTo(w / 2f, 0f)
                    lineTo(0f, h / 2f)
                    lineTo(w / 2f, h)
                    lineTo(w, h / 2f)
                    close()
                }
                drawPath(
                    path = path,
                    color = CelestialGold.copy(alpha = 0.45f),
                    style = Stroke(width = 2.dp.toPx())
                )
            }

            // Coordinates for North Indian Kundli style (Counter-Clockwise numbering)
            val housePositions = listOf(
                HousePlacement(x = 0.50f, y = 0.28f, numX = 0.50f, numY = 0.12f), // House 1
                HousePlacement(x = 0.28f, y = 0.12f, numX = 0.40f, numY = 0.08f), // House 2
                HousePlacement(x = 0.12f, y = 0.28f, numX = 0.08f, numY = 0.40f), // House 3
                HousePlacement(x = 0.28f, y = 0.50f, numX = 0.12f, numY = 0.50f), // House 4
                HousePlacement(x = 0.12f, y = 0.72f, numX = 0.08f, numY = 0.60f), // House 5
                HousePlacement(x = 0.28f, y = 0.88f, numX = 0.40f, numY = 0.92f), // House 6
                HousePlacement(x = 0.50f, y = 0.72f, numX = 0.50f, numY = 0.88f), // House 7
                HousePlacement(x = 0.72f, y = 0.88f, numX = 0.60f, numY = 0.92f), // House 8
                HousePlacement(x = 0.88f, y = 0.72f, numX = 0.92f, numY = 0.60f), // House 9
                HousePlacement(x = 0.72f, y = 0.50f, numX = 0.88f, numY = 0.50f), // House 10
                HousePlacement(x = 0.88f, y = 0.28f, numX = 0.92f, numY = 0.40f), // House 11
                HousePlacement(x = 0.72f, y = 0.12f, numX = 0.60f, numY = 0.08f)  // House 12
            )

            housePositions.forEachIndexed { index, pos ->
                val houseIndex = index + 1
                val isSelected = selectedHouse == houseIndex
                val signNum = chartData.houseSigns[index]

                // Rashi number layout
                Box(modifier = Modifier.fillMaxSize()) {
                    Text(
                        text = "$signNum",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (isSelected) AstralRose else SpaceLavender.copy(alpha = 0.75f),
                        modifier = Modifier
                            .align(Alignment.TopStart)
                            .padding(
                                start = (pos.numX * sizePx.value).dp - 6.dp,
                                top = (pos.numY * sizePx.value).dp - 6.dp
                            )
                    )
                }

                val planetsInHouse = chartData.planetPositions.filter { it.value == houseIndex }.keys.toList()

                // House click zone and planetary alignment
                Box(
                    modifier = Modifier
                        .size((sizePx.value * 0.16f).dp)
                        .offset(
                            x = (pos.x * sizePx.value).dp - (sizePx.value * 0.08f).dp,
                            y = (pos.y * sizePx.value).dp - (sizePx.value * 0.08f).dp
                        )
                        .clip(CircleShape)
                        .background(if (isSelected) AstralRose.copy(alpha = 0.18f) else Color.Transparent)
                        .border(
                            1.2.dp,
                            if (isSelected) AstralRose else Color.Transparent,
                            CircleShape
                        )
                        .clickable { selectedHouse = houseIndex }
                        .testTag("house_tap_$houseIndex"),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Text(
                            text = "H$houseIndex",
                            fontSize = 8.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = if (isSelected) AstralRose else CelestialGold.copy(alpha = 0.7f)
                        )
                        if (planetsInHouse.isNotEmpty()) {
                            Text(
                                text = planetsInHouse.joinToString(" "),
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Black,
                                color = if (isSelected) AstralRose else GalacticWhite,
                                textAlign = TextAlign.Center,
                                lineHeight = 11.sp
                            )
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Selected House Detail Panel
        selectedHouse?.let { houseNum ->
            val signIndex = chartData.houseSigns[houseNum - 1] - 1
            val rashiName = rashiFullNames[signIndex]
            val rashiEmoji = rashiEmojis[signIndex]
            val planetsInHouse = chartData.planetPositions.filter { it.value == houseNum }.keys.toList()

            Card(
                colors = CardDefaults.cardColors(containerColor = DeepMidnight.copy(alpha = 0.8f)),
                border = BorderStroke(1.dp, CelestialGold.copy(alpha = 0.25f)),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("house_detail_card")
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "🏠 House $houseNum Placement",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = CelestialGold
                        )
                        Text(
                            text = "$rashiEmoji $rashiName",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = AstralRose
                        )
                    }

                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = houseSignificance[houseNum - 1],
                        fontSize = 11.sp,
                        color = SpaceLavender,
                        lineHeight = 15.sp
                    )

                    Spacer(modifier = Modifier.height(10.dp))
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = "Resident Grahas: ",
                            fontSize = 11.sp,
                            color = GalacticWhite,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        if (planetsInHouse.isEmpty()) {
                            Text(
                                text = "None (Influenced directly by Lord of $rashiName)",
                                fontSize = 11.sp,
                                color = SpaceLavender.copy(alpha = 0.7f),
                                fontStyle = FontStyle.Italic
                            )
                        } else {
                            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                planetsInHouse.forEach { planet ->
                                    Box(
                                        modifier = Modifier
                                            .background(AstralRose.copy(alpha = 0.25f), RoundedCornerShape(4.dp))
                                            .padding(horizontal = 6.dp, vertical = 2.dp)
                                    ) {
                                        Text(
                                            text = when (planet) {
                                                "Su" -> "☀️ Sun"
                                                "Mo" -> "🌙 Moon"
                                                "Ma" -> "🔥 Mars"
                                                "Me" -> "✍️ Mercury"
                                                "Ju" -> "🕉️ Jupiter"
                                                "Ve" -> "💎 Venus"
                                                "Sa" -> "⏳ Saturn"
                                                "Ra" -> "🐉 Rahu"
                                                else -> "🏺 Ketu"
                                            },
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = GalacticWhite
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// --- Daily Personalized Horoscope Component ---
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DailyHoroscopeComponent(viewModel: AstrologyViewModel) {
    val dailyHoroscope by viewModel.dailyHoroscope.collectAsState()
    val isGeneratingDailyHoroscope by viewModel.isGeneratingDailyHoroscope.collectAsState()
    val sessions by viewModel.allSessions.collectAsState()
    val userProfile by viewModel.userProfile.collectAsState()
    val translatedDailyHoroscope by viewModel.translatedDailyHoroscope.collectAsState()
    val isTranslatingHoroscope by viewModel.isTranslatingHoroscope.collectAsState()

    val hasBirthDetails = remember(sessions) {
        sessions.any { it.dob.isNotBlank() && it.tob.isNotBlank() && it.pob.isNotBlank() }
    }

    var showModal by remember { mutableStateOf(false) }
    val context = LocalContext.current

    val referralCode = remember(userProfile) {
        val rawName = (userProfile?.name ?: "Seeker").uppercase().replace("[^A-Z0-9]".toRegex(), "")
        val cleanedName = if (rawName.isBlank()) "SEEKER" else rawName
        "ADI-$cleanedName"
    }

    Card(
        colors = CardDefaults.cardColors(containerColor = SoftPlum.copy(alpha = 0.5f)),
        border = BorderStroke(1.dp, CelestialGold.copy(alpha = 0.3f)),
        shape = RoundedCornerShape(20.dp),
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 16.dp)
            .testTag("daily_horoscope_banner_card")
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("🔮", fontSize = 24.sp)
                    Spacer(modifier = Modifier.width(8.dp))
                    Column {
                        Text(
                            text = "Daily Vedic Rashifal",
                            fontWeight = FontWeight.Bold,
                            color = CelestialGold,
                            fontSize = 16.sp
                        )
                        Text(
                            text = "Your transit alignment for today",
                            fontSize = 11.sp,
                            color = SpaceLavender
                        )
                    }
                }

                if (hasBirthDetails) {
                    Box(
                        modifier = Modifier
                            .background(AstralRose.copy(alpha = 0.15f), RoundedCornerShape(8.dp))
                            .border(1.dp, CelestialGold.copy(alpha = 0.4f), RoundedCornerShape(8.dp))
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Text(
                            text = "CALIBRATED",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            color = CelestialGold
                        )
                    }
                } else {
                    Box(
                        modifier = Modifier
                            .background(Color.Gray.copy(alpha = 0.15f), RoundedCornerShape(8.dp))
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Text(
                            text = "LOCKED",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.LightGray
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            if (hasBirthDetails) {
                Text(
                    text = "Unlock your personalized celestial insights for today. Calculated directly against your natal lagna and moon transits using Gemini AI.",
                    fontSize = 12.sp,
                    color = GalacticWhite,
                    textAlign = TextAlign.Center,
                    lineHeight = 16.sp,
                    modifier = Modifier.padding(horizontal = 4.dp)
                )

                Spacer(modifier = Modifier.height(14.dp))

                Button(
                    onClick = {
                        viewModel.fetchDailyHoroscope()
                        showModal = true
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = CelestialGold),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .fillMaxWidth(0.85f)
                        .testTag("view_horoscope_button")
                ) {
                    Icon(
                        imageVector = Icons.Filled.Star,
                        contentDescription = "Stars",
                        tint = DeepMidnight,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Reveal Daily Rashifal",
                        color = DeepMidnight,
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp
                    )
                }
            } else {
                Text(
                    text = "To unlock your daily horoscope, please first complete a consultation with any of our astrologers so we can construct and store your natal birth chart details.",
                    fontSize = 12.sp,
                    color = SpaceLavender,
                    textAlign = TextAlign.Center,
                    lineHeight = 16.sp,
                    fontStyle = FontStyle.Italic,
                    modifier = Modifier.padding(horizontal = 8.dp)
                )
            }
        }
    }

    if (showModal) {
        Dialog(
            onDismissRequest = { showModal = false },
            properties = DialogProperties(usePlatformDefaultWidth = false)
        ) {
            Surface(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(top = 40.dp)
                    .clip(RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)),
                color = DeepMidnight
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(DeepMidnight)
                        .padding(20.dp)
                ) {
                    // Header row
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("🕉️", fontSize = 24.sp)
                            Spacer(modifier = Modifier.width(8.dp))
                            Column {
                                Text(
                                    text = "Your Daily Rashifal",
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = CelestialGold
                                )
                                Text(
                                    text = "Adi Jyotish Gurus Daily Transits",
                                    fontSize = 11.sp,
                                    color = SpaceLavender
                                )
                            }
                        }
                        IconButton(
                            onClick = { showModal = false },
                            modifier = Modifier
                                .background(SoftPlum, CircleShape)
                                .size(36.dp)
                                .testTag("close_horoscope_modal")
                        ) {
                            Icon(
                                imageVector = Icons.Filled.Close,
                                contentDescription = "Close",
                                tint = GalacticWhite,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }

                    HorizontalDivider(
                        color = CelestialGold.copy(alpha = 0.2f),
                        modifier = Modifier.padding(vertical = 16.dp)
                    )

                    if (isGeneratingDailyHoroscope) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .weight(1f),
                            verticalArrangement = Arrangement.Center,
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            CircularProgressIndicator(color = CelestialGold)
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(
                                text = "Consulting daily transits...",
                                color = SpaceLavender,
                                fontSize = 14.sp,
                                fontStyle = FontStyle.Italic
                            )
                            Text(
                                text = "Tracking Moon (Chandra) movements & Lagna aspects...",
                                color = Color.Gray,
                                fontSize = 11.sp,
                                textAlign = TextAlign.Center,
                                modifier = Modifier.padding(top = 4.dp, start = 24.dp, end = 24.dp)
                              )
                        }
                    } else {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .weight(1f)
                                .verticalScroll(rememberScrollState())
                        ) {
                            dailyHoroscope?.let { text ->
                                // Dynamic Translation Selector Panel
                                Card(
                                    colors = CardDefaults.cardColors(containerColor = SoftPlum.copy(alpha = 0.5f)),
                                    border = BorderStroke(1.dp, CelestialGold.copy(alpha = 0.3f)),
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(bottom = 12.dp)
                                ) {
                                    Column(modifier = Modifier.padding(12.dp)) {
                                        Text(
                                            text = "🌐 Translate Rashifal dynamically / अनुवाद करें:",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = CelestialGold
                                        )
                                        Spacer(modifier = Modifier.height(8.dp))
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                                        ) {
                                            listOf("Hinglish", "Hindi", "English", "French", "Spanish").forEach { targetLang ->
                                                val label = when (targetLang) {
                                                    "Hinglish" -> "Hinglish"
                                                    "Hindi" -> "हिन्दी"
                                                    else -> targetLang
                                                }
                                                Box(
                                                    modifier = Modifier
                                                        .weight(1f)
                                                        .clip(RoundedCornerShape(6.dp))
                                                        .background(DeepMidnight)
                                                        .border(1.dp, CelestialGold.copy(alpha = 0.2f), RoundedCornerShape(6.dp))
                                                        .clickable { viewModel.translateDailyHoroscope(targetLang) }
                                                        .padding(vertical = 6.dp),
                                                    contentAlignment = Alignment.Center
                                                ) {
                                                    Text(label, fontSize = 10.sp, color = GalacticWhite, fontWeight = FontWeight.Bold)
                                                }
                                            }
                                        }
                                        if (translatedDailyHoroscope != null) {
                                            Spacer(modifier = Modifier.height(8.dp))
                                            TextButton(
                                                onClick = { viewModel.clearHoroscopeTranslation() },
                                                modifier = Modifier.align(Alignment.End)
                                            ) {
                                                Text("Reset to Original", color = AstralRose, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                            }
                                        }
                                    }
                                }

                                if (isTranslatingHoroscope) {
                                    Box(
                                        modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        CircularProgressIndicator(color = CelestialGold, modifier = Modifier.size(20.dp))
                                    }
                                }

                                Card(
                                    colors = CardDefaults.cardColors(containerColor = SoftPlum.copy(alpha = 0.3f)),
                                    border = BorderStroke(1.dp, SpaceLavender.copy(alpha = 0.15f)),
                                    shape = RoundedCornerShape(16.dp),
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(bottom = 16.dp)
                                ) {
                                    Text(
                                        text = translatedDailyHoroscope ?: text,
                                        fontSize = 14.sp,
                                        color = GalacticWhite,
                                        lineHeight = 22.sp,
                                        modifier = Modifier.padding(16.dp)
                                    )
                                }

                                Spacer(modifier = Modifier.height(8.dp))

                                // Share / Invite Area Card
                                Card(
                                    colors = CardDefaults.cardColors(containerColor = SoftPlum),
                                    border = BorderStroke(1.dp, SpaceLavender.copy(alpha = 0.2f)),
                                    shape = RoundedCornerShape(14.dp),
                                    modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp)
                                ) {
                                    Column(modifier = Modifier.padding(16.dp)) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Text("📢", fontSize = 20.sp)
                                            Spacer(modifier = Modifier.width(8.dp))
                                            Text("Share & Invite Bonus", fontWeight = FontWeight.Bold, color = CelestialGold, fontSize = 14.sp)
                                        }
                                        Spacer(modifier = Modifier.height(6.dp))
                                        Text(
                                            text = "Share today's customized transit Rashifal on social media! Includes your referral code ($referralCode) and promotional app ad. When a friend installs and activates a plan, you instantly get credited 50% of their activated plan inside your Celestial Wallet (One-Time Cap applies) to check future horoscopes for FREE!",
                                            fontSize = 11.sp,
                                            color = SpaceLavender,
                                            lineHeight = 15.sp
                                        )
                                        
                                        Spacer(modifier = Modifier.height(14.dp))
                                        
                                        // Button 1: Real sharing
                                        Button(
                                            onClick = {
                                                shareHoroscopeImage(context, userProfile?.name ?: "Seeker", text, referralCode)
                                            },
                                            colors = ButtonDefaults.buttonColors(containerColor = CelestialGold),
                                            shape = RoundedCornerShape(10.dp),
                                            modifier = Modifier.fillMaxWidth().padding(bottom = 14.dp).testTag("share_horoscope_image_button")
                                        ) {
                                            Icon(imageVector = Icons.Filled.Share, contentDescription = "Share", tint = DeepMidnight, modifier = Modifier.size(16.dp))
                                            Spacer(modifier = Modifier.width(6.dp))
                                            Text("Share Rashifal Image", color = DeepMidnight, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                                        }

                                        // Sandbox simulation block
                                        ReferralSimulationSection(viewModel = viewModel)
                                    }
                                }
                            } ?: run {
                                Text(
                                    text = "Error loading daily horoscope stars.",
                                    color = Color.Red,
                                    fontSize = 14.sp,
                                    modifier = Modifier.padding(16.dp)
                                )
                            }

                            Spacer(modifier = Modifier.height(16.dp))

                            Button(
                                onClick = { viewModel.fetchDailyHoroscope() },
                                colors = ButtonDefaults.buttonColors(containerColor = SoftPlum),
                                border = BorderStroke(1.dp, CelestialGold.copy(alpha = 0.3f)),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .testTag("refresh_horoscope_button")
                            ) {
                                Icon(
                                    imageVector = Icons.Filled.Refresh,
                                    contentDescription = "Refresh",
                                    tint = CelestialGold,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "Recalibrate Transits",
                                    color = CelestialGold,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.sp
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

// --- Image Generation & Sharing Utilities ---
fun shareHoroscopeImage(context: Context, userName: String, text: String, referralCode: String) {
    try {
        val bitmap = Bitmap.createBitmap(1080, 1350, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        
        // Background Paint
        val bgPaint = Paint().apply {
            isAntiAlias = true
            shader = LinearGradient(
                0f, 0f, 0f, 1350f,
                intArrayOf(0xFF0B0814.toInt(), 0xFF1C192E.toInt(), 0xFF141124.toInt()),
                null,
                Shader.TileMode.CLAMP
            )
        }
        canvas.drawRect(0f, 0f, 1080f, 1350f, bgPaint)
        
        // Draw elegant golden frame (double border)
        val framePaint = Paint().apply {
            isAntiAlias = true
            color = 0xFFD4AF37.toInt() // CelestialGold
            style = Paint.Style.STROKE
            strokeWidth = 6f
        }
        canvas.drawRect(30f, 30f, 1050f, 1320f, framePaint)
        
        val innerFramePaint = Paint().apply {
            isAntiAlias = true
            color = 0xFFD4AF37.toInt()
            alpha = 100 // semi transparent
            style = Paint.Style.STROKE
            strokeWidth = 2f
        }
        canvas.drawRect(45f, 45f, 1035f, 1305f, innerFramePaint)
        
        // Star accents in corners
        val starPaint = Paint().apply {
            isAntiAlias = true
            color = 0xFFD4AF37.toInt()
            textSize = 24f
            textAlign = Paint.Align.CENTER
        }
        canvas.drawText("✦", 60f, 80f, starPaint)
        canvas.drawText("✦", 1020f, 80f, starPaint)
        canvas.drawText("✦", 60f, 1290f, starPaint)
        canvas.drawText("✦", 1020f, 1290f, starPaint)
        
        // Title
        val titlePaint = Paint().apply {
            isAntiAlias = true
            color = 0xFFD4AF37.toInt() // CelestialGold
            textSize = 48f
            style = Paint.Style.FILL
            isFakeBoldText = true
            textAlign = Paint.Align.CENTER
        }
        canvas.drawText("🕉️ ADI JYOTISH GURUS 🕉️", 540f, 150f, titlePaint)
        
        // Subtitle
        val subPaint = Paint().apply {
            isAntiAlias = true
            color = 0xFFB39DDB.toInt() // SpaceLavender
            textSize = 28f
            isFakeBoldText = true
            textAlign = Paint.Align.CENTER
            letterSpacing = 0.05f
        }
        val currentDate = SimpleDateFormat("EEEE, dd MMMM yyyy", Locale.getDefault()).format(Date())
        canvas.drawText("DAILY PERSONALIZED RASHIFAL", 540f, 210f, subPaint)
        
        val datePaint = Paint().apply {
            isAntiAlias = true
            color = 0xFFF1F5F9.toInt() // GalacticWhite
            textSize = 24f
            textAlign = Paint.Align.CENTER
        }
        canvas.drawText(currentDate, 540f, 250f, datePaint)
        
        // Calibrated For banner
        val namePaint = Paint().apply {
            isAntiAlias = true
            color = 0xFFD4AF37.toInt()
            textSize = 26f
            isFakeBoldText = true
            textAlign = Paint.Align.CENTER
        }
        canvas.drawText("Calibrated for: $userName", 540f, 310f, namePaint)
        
        // Divider
        val divPaint = Paint().apply {
            color = 0xFFB39DDB.toInt()
            alpha = 80
            strokeWidth = 2f
        }
        canvas.drawLine(150f, 340f, 930f, 340f, divPaint)
        
        // Horoscope content body
        val textPaint = Paint().apply {
            isAntiAlias = true
            color = 0xFFF1F5F9.toInt() // GalacticWhite
            textSize = 28f
        }
        
        // Prepare text formatting for drawing
        val formattedText = text.replace("**", "") // strip markdown bold symbols
        val textX = 100f
        var textY = 400f
        val textWidth = 880f
        val lineHeight = 42f
        
        // Draw horoscope wrapped text
        drawWrappedText(canvas, formattedText, textPaint, textX, textY, textWidth, lineHeight)
        
        // Bottom divider
        canvas.drawLine(150f, 1100f, 930f, 1100f, divPaint)
        
        // Promo ad section
        val adTitlePaint = Paint().apply {
            isAntiAlias = true
            color = 0xFFD4AF37.toInt()
            textSize = 26f
            isFakeBoldText = true
            textAlign = Paint.Align.CENTER
        }
        canvas.drawText("🔮 Download Adi Jyotish Gurus App to get yours! 🔮", 540f, 1160f, adTitlePaint)
        
        val adPromoPaint = Paint().apply {
            isAntiAlias = true
            color = 0xFFF1F5F9.toInt()
            textSize = 24f
            textAlign = Paint.Align.CENTER
        }
        canvas.drawText("Use Referral Code: $referralCode to receive ₹100 signup credit!", 540f, 1210f, adPromoPaint)
        
        // Save to cache
        val cachePath = File(context.cacheDir, "shared_horoscope")
        cachePath.mkdirs()
        val file = File(cachePath, "rashifal_${System.currentTimeMillis()}.png")
        val stream = FileOutputStream(file)
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)
        stream.close()
        
        // Share Intent
        val authority = "${context.packageName}.fileprovider"
        val contentUri = FileProvider.getUriForFile(context, authority, file)
        
        val shareIntent = Intent().apply {
            action = Intent.ACTION_SEND
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            setDataAndType(contentUri, context.contentResolver.getType(contentUri))
            putExtra(Intent.EXTRA_STREAM, contentUri)
            putExtra(Intent.EXTRA_TEXT, "Jai Ho! Here is my customized Daily Vedic Rashifal from Adi Jyotish Gurus. Use my code '$referralCode' to get a ₹100 credit when you sign up! 🔮✨\n\nDownload now to check your stars!")
        }
        
        context.startActivity(Intent.createChooser(shareIntent, "Share Daily Rashifal"))
        
    } catch (e: Exception) {
        android.util.Log.e("ShareHoroscope", "Error sharing horoscope image", e)
    }
}

private fun drawWrappedText(canvas: Canvas, text: String, paint: Paint, x: Float, yStart: Float, maxWidth: Float, lineHeight: Float): Float {
    var y = yStart
    val paragraphs = text.split("\n")
    for (paragraph in paragraphs) {
        val words = paragraph.split(" ")
        var currentLine = StringBuilder()
        for (word in words) {
            val testLine = if (currentLine.isEmpty()) word else currentLine.toString() + " " + word
            val width = paint.measureText(testLine)
            if (width > maxWidth) {
                canvas.drawText(currentLine.toString(), x, y, paint)
                y += lineHeight
                if (y > 1050f) {
                    canvas.drawText("... (read more in app)", x, y, paint)
                    return y + lineHeight
                }
                currentLine = StringBuilder(word)
            } else {
                currentLine.append(if (currentLine.isEmpty()) "" else " ").append(word)
            }
        }
        if (currentLine.isNotEmpty()) {
            canvas.drawText(currentLine.toString(), x, y, paint)
            y += lineHeight
        }
        y += 10f
    }
    return y
}

@Composable
fun ReferralSimulationSection(viewModel: AstrologyViewModel) {
    val userProfile by viewModel.userProfile.collectAsState()
    val isClaimed = userProfile?.referralClaimed ?: false

    val plans = listOf(
        Pair("Bronze Plan", 199),
        Pair("Silver Plan", 499),
        Pair("Gold Plan", 1999),
        Pair("Single Consult", 300)
    )

    var selectedPlanIndex by remember { mutableStateOf(2) } // default Gold
    val (selectedName, selectedPrice) = plans[selectedPlanIndex]
    val bonusAmount = (selectedPrice * 0.5).toInt()

    Card(
        colors = CardDefaults.cardColors(containerColor = SoftPlum.copy(alpha = 0.5f)),
        border = BorderStroke(1.dp, CelestialGold.copy(alpha = 0.3f)),
        shape = RoundedCornerShape(14.dp),
        modifier = Modifier.fillMaxWidth().testTag("referral_simulation_card")
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(
                text = "🔧 ASTROLOGY REFERRAL SANDBOX",
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = CelestialGold,
                modifier = Modifier.padding(bottom = 8.dp)
            )

            Text(
                text = "Select a plan that your referred friend activates to simulate their first paid horoscope check:",
                fontSize = 11.sp,
                color = SpaceLavender,
                lineHeight = 14.sp,
                modifier = Modifier.padding(bottom = 12.dp)
            )

            // Horizontal row of chips
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                plans.forEachIndexed { index, (name, price) ->
                    val isSelected = index == selectedPlanIndex
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .background(
                                if (isSelected) CelestialGold.copy(alpha = 0.2f) else Color.Transparent,
                                RoundedCornerShape(8.dp)
                            )
                            .border(
                                1.dp,
                                if (isSelected) CelestialGold else SpaceLavender.copy(alpha = 0.3f),
                                RoundedCornerShape(8.dp)
                            )
                            .clickable { selectedPlanIndex = index }
                            .padding(vertical = 8.dp, horizontal = 4.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = name.split(" ")[0],
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (isSelected) CelestialGold else GalacticWhite
                            )
                            Text(
                                text = "₹$price",
                                fontSize = 10.sp,
                                color = if (isSelected) CelestialGold else SpaceLavender
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Bonus preview
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(DeepMidnight, RoundedCornerShape(8.dp))
                    .padding(8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Expected Referral Bonus (50%):",
                    fontSize = 11.sp,
                    color = SpaceLavender
                )
                Text(
                    text = "₹$bonusAmount",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = CelestialGold
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Button(
                    onClick = {
                        viewModel.simulateReferralInstallAndPurchase(selectedName, selectedPrice)
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isClaimed) Color.Gray.copy(alpha = 0.3f) else CelestialGold,
                        disabledContainerColor = Color.Gray.copy(alpha = 0.3f)
                    ),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier
                        .weight(1.5f)
                        .height(38.dp)
                        .testTag("run_referral_simulation_button")
                ) {
                    Icon(
                        imageVector = Icons.Filled.Download,
                        contentDescription = "Simulate",
                        tint = if (isClaimed) Color.LightGray else DeepMidnight,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = if (isClaimed) "One-Time Cap Active" else "Simulate Friend Pay",
                        color = if (isClaimed) Color.LightGray else DeepMidnight,
                        fontWeight = FontWeight.Bold,
                        fontSize = 11.sp
                    )
                }

                if (isClaimed) {
                    Button(
                        onClick = { viewModel.resetReferralStatus() },
                        colors = ButtonDefaults.buttonColors(containerColor = SoftPlum),
                        border = BorderStroke(1.dp, SpaceLavender.copy(alpha = 0.4f)),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier
                            .weight(1f)
                            .height(38.dp)
                            .testTag("reset_referral_simulation_button")
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Refresh,
                            contentDescription = "Reset",
                            tint = SpaceLavender,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "Reset Limit",
                            color = SpaceLavender,
                            fontWeight = FontWeight.Bold,
                            fontSize = 10.sp
                        )
                    }
                }
            }
            
            if (isClaimed) {
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "🔒 One-time limit reached! Click 'Reset Limit' to test other plans.",
                    fontSize = 10.sp,
                    color = AstralRose,
                    fontStyle = FontStyle.Italic,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }
    }
}

@Composable
fun AstroFaqComponent(viewModel: AstrologyViewModel) {
    val faqAnswer by viewModel.faqAnswer.collectAsState()
    val isFaqLoading by viewModel.isFaqLoading.collectAsState()
    val faqError by viewModel.faqError.collectAsState()

    var customQuestion by remember { mutableStateOf("") }

    Card(
        colors = CardDefaults.cardColors(containerColor = SoftPlum.copy(alpha = 0.6f)),
        border = BorderStroke(1.dp, CelestialGold.copy(alpha = 0.3f)),
        shape = RoundedCornerShape(16.dp),
        modifier = Modifier
            .fillMaxWidth()
            .testTag("astro_faq_component_card")
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Header
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                CelestialBadge(symbol = "🕉️", size = 40)
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(
                        text = "CELESTIAL FAQ ASSISTANT",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = CelestialGold,
                        modifier = Modifier.testTag("faq_header_title")
                    )
                    Text(
                        text = "Ask about Vedic Jyotish or our consultation process",
                        fontSize = 11.sp,
                        color = SpaceLavender
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Pre-defined questions
            Text(
                text = "Tap a common query to ask the Gurus:",
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
                color = GalacticWhite,
                modifier = Modifier.padding(bottom = 8.dp)
            )

            // Equal-width robust Row of chips (No FlowRow required)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                listOf("How does consultation work?", "What is Vedic Astrology?").forEach { question ->
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .background(DeepMidnight, RoundedCornerShape(20.dp))
                            .border(
                                width = 1.dp,
                                color = CelestialGold.copy(alpha = 0.25f),
                                shape = RoundedCornerShape(20.dp)
                            )
                            .clickable(enabled = !isFaqLoading) {
                                customQuestion = question
                                viewModel.askAstroFAQ(question)
                            }
                            .padding(horizontal = 10.dp, vertical = 8.dp)
                            .testTag("faq_chip_${question.replace(" ", "_").replace("?", "")}"),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = question,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                            color = CelestialGold,
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                listOf("Is birth time important?", "What is a Kundli?", "How do tiers work?").forEach { question ->
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .background(DeepMidnight, RoundedCornerShape(20.dp))
                            .border(
                                width = 1.dp,
                                color = CelestialGold.copy(alpha = 0.25f),
                                shape = RoundedCornerShape(20.dp)
                            )
                            .clickable(enabled = !isFaqLoading) {
                                customQuestion = question
                                viewModel.askAstroFAQ(question)
                            }
                            .padding(horizontal = 8.dp, vertical = 8.dp)
                            .testTag("faq_chip_${question.replace(" ", "_").replace("?", "")}"),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = question,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Medium,
                            color = CelestialGold,
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Custom Question Input
            OutlinedTextField(
                value = customQuestion,
                onValueChange = { customQuestion = it },
                label = { Text("Or write your custom query...", color = SpaceLavender, fontSize = 12.sp) },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = GalacticWhite,
                    unfocusedTextColor = GalacticWhite,
                    focusedBorderColor = CelestialGold,
                    unfocusedBorderColor = SpaceLavender.copy(alpha = 0.4f),
                    focusedContainerColor = DeepMidnight,
                    unfocusedContainerColor = DeepMidnight
                ),
                textStyle = MaterialTheme.typography.bodyMedium.copy(fontSize = 13.sp),
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("faq_custom_input_field"),
                shape = RoundedCornerShape(12.dp),
                enabled = !isFaqLoading,
                trailingIcon = {
                    if (customQuestion.isNotEmpty()) {
                        IconButton(onClick = { customQuestion = "" }) {
                            Icon(
                                imageVector = Icons.Filled.Close,
                                contentDescription = "Clear",
                                tint = SpaceLavender,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }
                }
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Action Buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Button(
                    onClick = { viewModel.askAstroFAQ(customQuestion) },
                    enabled = customQuestion.isNotBlank() && !isFaqLoading,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = CelestialGold,
                        disabledContainerColor = Color.Gray.copy(alpha = 0.3f)
                    ),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier
                        .weight(1.5f)
                        .height(40.dp)
                        .testTag("faq_query_button")
                ) {
                    if (isFaqLoading) {
                        CircularProgressIndicator(
                            color = DeepMidnight,
                            modifier = Modifier.size(14.dp),
                            strokeWidth = 2.dp
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Consulting Gurus...",
                            color = DeepMidnight,
                            fontWeight = FontWeight.Bold,
                            fontSize = 11.sp
                        )
                    } else {
                        Icon(
                            imageVector = Icons.Filled.Star,
                            contentDescription = "Search",
                            tint = DeepMidnight,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "Query the Stars",
                            color = DeepMidnight,
                            fontWeight = FontWeight.Bold,
                            fontSize = 11.sp
                        )
                    }
                }

                if (faqAnswer != null || faqError != null) {
                    Button(
                        onClick = {
                            viewModel.clearFAQ()
                            customQuestion = ""
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = SoftPlum),
                        border = BorderStroke(1.dp, SpaceLavender.copy(alpha = 0.4f)),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier
                            .weight(1f)
                            .height(40.dp)
                            .testTag("faq_clear_button")
                    ) {
                        Text(
                            text = "Clear",
                            color = SpaceLavender,
                            fontWeight = FontWeight.Bold,
                            fontSize = 11.sp
                        )
                    }
                }
            }

            // Results Display Section
            if (isFaqLoading) {
                Spacer(modifier = Modifier.height(16.dp))
                Card(
                    colors = CardDefaults.cardColors(containerColor = DeepMidnight),
                    border = BorderStroke(1.dp, CelestialGold.copy(alpha = 0.15f)),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = "Scanning the celestial libraries of Adi Jyotish Gurus...",
                            fontSize = 11.sp,
                            color = SpaceLavender,
                            fontStyle = FontStyle.Italic,
                            textAlign = TextAlign.Center
                        )
                    }
                }
            } else if (faqError != null) {
                Spacer(modifier = Modifier.height(16.dp))
                Card(
                    colors = CardDefaults.cardColors(containerColor = DeepMidnight),
                    border = BorderStroke(1.dp, AstralRose.copy(alpha = 0.4f)),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = faqError ?: "Unknown alignment error.",
                        fontSize = 12.sp,
                        color = AstralRose,
                        modifier = Modifier.padding(12.dp)
                    )
                }
            } else if (faqAnswer != null) {
                Spacer(modifier = Modifier.height(16.dp))
                Card(
                    colors = CardDefaults.cardColors(containerColor = DeepMidnight),
                    border = BorderStroke(1.dp, CelestialGold.copy(alpha = 0.25f)),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)
                        ) {
                            Text(
                                text = "✨ Gurus' Real-time Answer:",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = CelestialGold
                            )
                            Text(
                                text = "Gemini 3.5 Flash",
                                fontSize = 9.sp,
                                color = SpaceLavender,
                                fontStyle = FontStyle.Italic
                            )
                        }

                        Text(
                            text = faqAnswer ?: "",
                            fontSize = 12.sp,
                            color = GalacticWhite,
                            lineHeight = 18.sp,
                            modifier = Modifier.testTag("faq_answer_display_text")
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun NotificationBellIcon(viewModel: AstrologyViewModel) {
    val notifications by viewModel.notifications.collectAsState()
    val unreadCount = remember(notifications) { notifications.count { !it.isRead } }
    var showDialog by remember { mutableStateOf(false) }

    Box(
        modifier = Modifier
            .size(42.dp)
            .background(SoftPlum.copy(alpha = 0.4f), RoundedCornerShape(12.dp))
            .border(1.dp, CelestialGold.copy(alpha = 0.2f), RoundedCornerShape(12.dp))
            .clickable { showDialog = true }
            .testTag("notification_bell_container"),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = if (unreadCount > 0) Icons.Filled.Notifications else Icons.Outlined.Notifications,
            contentDescription = "Notifications",
            tint = if (unreadCount > 0) CelestialGold else SpaceLavender,
            modifier = Modifier.size(22.dp)
        )

        if (unreadCount > 0) {
            Box(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .offset(x = 4.dp, y = (-4).dp)
                    .background(AstralRose, CircleShape)
                    .padding(horizontal = 5.dp, vertical = 2.dp)
                    .testTag("notification_badge_count")
            ) {
                Text(
                    text = unreadCount.toString(),
                    color = Color.White,
                    fontSize = 8.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }

    if (showDialog) {
        AstroNotificationHubDialog(
            viewModel = viewModel,
            onDismiss = { showDialog = false }
        )
    }
}

@Composable
fun AstroNotificationHubDialog(
    viewModel: AstrologyViewModel,
    onDismiss: () -> Unit
) {
    val notifications by viewModel.notifications.collectAsState()

    Dialog(onDismissRequest = onDismiss) {
        Card(
            colors = CardDefaults.cardColors(containerColor = DarkSpacePurple),
            border = BorderStroke(2.dp, CelestialGold),
            shape = RoundedCornerShape(20.dp),
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 16.dp)
                .testTag("notification_hub_dialog")
        ) {
            Column(
                modifier = Modifier
                    .padding(18.dp)
                    .fillMaxWidth()
            ) {
                // Header row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Filled.Notifications,
                            contentDescription = null,
                            tint = CelestialGold,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "CELESTIAL ALERTS",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = CelestialGold
                        )
                    }

                    IconButton(
                        onClick = onDismiss,
                        modifier = Modifier.size(28.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Close,
                            contentDescription = "Close",
                            tint = SpaceLavender,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Actions row: Mark all as read & Clear all
                if (notifications.isNotEmpty()) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        TextButton(
                            onClick = { viewModel.markAllAsRead() },
                            modifier = Modifier.testTag("notification_mark_all_read_btn")
                        ) {
                            Text(
                                "Mark all as read",
                                color = CelestialGold,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        TextButton(
                            onClick = { viewModel.clearAllNotifications() },
                            modifier = Modifier.testTag("notification_clear_all_btn")
                        ) {
                            Text(
                                "Clear all",
                                color = AstralRose,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(6.dp))

                // Notifications List inside Box
                Box(
                    modifier = Modifier
                        .weight(1f, fill = false)
                        .heightIn(max = 280.dp)
                        .fillMaxWidth()
                ) {
                    if (notifications.isEmpty()) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 32.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                text = "🌌",
                                fontSize = 36.sp,
                                modifier = Modifier.padding(bottom = 8.dp)
                            )
                            Text(
                                text = "Your skies are clear of alerts.",
                                fontSize = 12.sp,
                                color = SpaceLavender,
                                fontWeight = FontWeight.Medium
                            )
                            Text(
                                text = "Check back soon for cosmic alignment shifts.",
                                fontSize = 10.sp,
                                color = Color.Gray
                            )
                        }
                    } else {
                        LazyColumn(
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            items(notifications) { notification ->
                                AstroNotificationCard(
                                    notification = notification,
                                    onRead = { viewModel.markAsRead(notification.id) },
                                    onDismiss = { viewModel.dismissNotification(notification.id) }
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // TEST / SANDBOX CONTROLS SECTION
                HorizontalDivider(color = CelestialGold.copy(alpha = 0.2f), thickness = 1.dp)
                Spacer(modifier = Modifier.height(10.dp))

                Text(
                    text = "🛠️ SANDBOX: TRIGGER ALERTS",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = SpaceLavender,
                    modifier = Modifier.padding(bottom = 6.dp)
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Button(
                        onClick = { viewModel.simulateDailyHoroscopeNotification() },
                        colors = ButtonDefaults.buttonColors(containerColor = SoftPlum),
                        border = BorderStroke(1.dp, CelestialGold.copy(alpha = 0.3f)),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier
                            .weight(1f)
                            .height(34.dp)
                            .testTag("simulate_faq_notification_btn")
                    ) {
                        Text(
                            text = "Daily Horoscope",
                            fontSize = 9.sp,
                            color = CelestialGold,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    Button(
                        onClick = { viewModel.simulateConsultationNotification() },
                        colors = ButtonDefaults.buttonColors(containerColor = SoftPlum),
                        border = BorderStroke(1.dp, CelestialGold.copy(alpha = 0.3f)),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier
                            .weight(1f)
                            .height(34.dp)
                            .testTag("simulate_insight_notification_btn")
                    ) {
                        Text(
                            text = "Consult Insight",
                            fontSize = 9.sp,
                            color = CelestialGold,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun AstroNotificationCard(
    notification: AstroNotification,
    onRead: () -> Unit,
    onDismiss: () -> Unit
) {
    Card(
        colors = CardDefaults.cardColors(
            containerColor = if (notification.isRead) DeepMidnight.copy(alpha = 0.5f) else DeepMidnight
        ),
        border = BorderStroke(
            width = 1.dp,
            color = if (notification.isRead) SpaceLavender.copy(alpha = 0.15f) else CelestialGold.copy(alpha = 0.35f)
        ),
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onRead() }
            .testTag("notification_card_${notification.id}")
    ) {
        Column(modifier = Modifier.padding(10.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Row(
                    modifier = Modifier.weight(1f),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Indicator circle
                    if (!notification.isRead) {
                        Box(
                            modifier = Modifier
                                .size(6.dp)
                                .background(CelestialGold, CircleShape)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                    }

                    Text(
                        text = notification.title,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (notification.isRead) SpaceLavender else GalacticWhite
                    )
                }

                IconButton(
                    onClick = onDismiss,
                    modifier = Modifier
                        .size(18.dp)
                        .testTag("notification_dismiss_btn_${notification.id}")
                ) {
                    Icon(
                        imageVector = Icons.Filled.Close,
                        contentDescription = "Dismiss",
                        tint = Color.Gray,
                        modifier = Modifier.size(12.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(4.dp))

            Text(
                text = notification.message,
                fontSize = 10.sp,
                color = SpaceLavender,
                lineHeight = 13.sp
            )
        }
    }
}

@Composable
fun VedicPanchangComponent(viewModel: AstrologyViewModel) {
    val currentPanchang by viewModel.currentPanchang.collectAsState()
    
    Card(
        colors = CardDefaults.cardColors(containerColor = SoftPlum.copy(alpha = 0.5f)),
        border = BorderStroke(1.dp, CelestialGold.copy(alpha = 0.3f)),
        shape = RoundedCornerShape(20.dp),
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 16.dp)
            .testTag("vedic_panchang_card")
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("📅", fontSize = 24.sp)
                    Spacer(modifier = Modifier.width(8.dp))
                    Column {
                        Text(
                            text = "Vedic Panchang Calendar",
                            fontWeight = FontWeight.Bold,
                            color = CelestialGold,
                            fontSize = 16.sp
                        )
                        Text(
                            text = "Daily celestial timeline & sacred timings",
                            fontSize = 11.sp,
                            color = SpaceLavender
                        )
                    }
                }
                
                Box(
                    modifier = Modifier
                        .background(CelestialGold.copy(alpha = 0.1f), RoundedCornerShape(8.dp))
                        .border(1.dp, CelestialGold.copy(alpha = 0.4f), RoundedCornerShape(8.dp))
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = currentPanchang?.date ?: "TODAY",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = CelestialGold
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            currentPanchang?.let { panchang ->
                // Grid of Panchang parameters
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Tithi Card
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .background(DeepMidnight, RoundedCornerShape(12.dp))
                            .border(1.dp, SpaceLavender.copy(alpha = 0.1f), RoundedCornerShape(12.dp))
                            .padding(10.dp)
                    ) {
                        Column {
                            Text("Tithi (तिथि)", fontSize = 10.sp, color = SpaceLavender)
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(panchang.tithi, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = GalacticWhite)
                        }
                    }
                    // Nakshatra Card
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .background(DeepMidnight, RoundedCornerShape(12.dp))
                            .border(1.dp, SpaceLavender.copy(alpha = 0.1f), RoundedCornerShape(12.dp))
                            .padding(10.dp)
                    ) {
                        Column {
                            Text("Nakshatra (नक्षत्र)", fontSize = 10.sp, color = SpaceLavender)
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(panchang.nakshatra, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = GalacticWhite)
                        }
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Sunrise / Sunset
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .background(DeepMidnight, RoundedCornerShape(12.dp))
                            .border(1.dp, SpaceLavender.copy(alpha = 0.1f), RoundedCornerShape(12.dp))
                            .padding(10.dp)
                    ) {
                        Column {
                            Text("Sunrise / Sunset", fontSize = 10.sp, color = SpaceLavender)
                            Spacer(modifier = Modifier.height(2.dp))
                            Text("${panchang.sunrise} / ${panchang.sunset}", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = GalacticWhite)
                        }
                    }
                    // Rahu Kaal
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .background(DeepMidnight, RoundedCornerShape(12.dp))
                            .border(1.dp, SpaceLavender.copy(alpha = 0.1f), RoundedCornerShape(12.dp))
                            .padding(10.dp)
                    ) {
                        Column {
                            Text("Rahu Kaal (⚡)", fontSize = 10.sp, color = SpaceLavender)
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(panchang.rahuKaal, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = AstralRose)
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Short Hinglish explanation of today's celestial event
                Card(
                    colors = CardDefaults.cardColors(containerColor = SoftPlum),
                    border = BorderStroke(1.dp, CelestialGold.copy(alpha = 0.15f)),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("✨", fontSize = 16.sp)
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "Today's Significance / आज का महत्व:",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = CelestialGold
                            )
                        }
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = panchang.explanation,
                            fontSize = 11.sp,
                            color = SpaceLavender,
                            lineHeight = 16.sp
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun InAppMarketingComponent(viewModel: AstrologyViewModel) {
    val campaigns by viewModel.campaigns.collectAsState()
    
    if (campaigns.isEmpty()) return

    var activeIndex by remember { mutableStateOf(0) }
    
    // Ensure activeIndex is always valid
    if (activeIndex >= campaigns.size) {
        activeIndex = maxOf(0, campaigns.size - 1)
    }
    
    val campaign = campaigns[activeIndex]
    
    Card(
        colors = CardDefaults.cardColors(containerColor = DeepMidnight),
        border = BorderStroke(1.5.dp, Brush.linearGradient(listOf(CelestialGold.copy(alpha = 0.8f), SpaceLavender.copy(alpha = 0.3f)))),
        shape = RoundedCornerShape(20.dp),
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 16.dp)
            .testTag("marketing_campaign_card_${campaign.id}")
    ) {
        Box(modifier = Modifier.fillMaxWidth()) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
            ) {
                // Top Campaign Badge & Close button Row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(campaign.iconSymbol, fontSize = 20.sp)
                        Spacer(modifier = Modifier.width(8.dp))
                        campaign.badgeText?.let { badge ->
                            Box(
                                modifier = Modifier
                                    .background(CelestialGold.copy(alpha = 0.15f), RoundedCornerShape(4.dp))
                                    .border(0.5.dp, CelestialGold, RoundedCornerShape(4.dp))
                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                            ) {
                                Text(
                                    text = badge,
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = CelestialGold
                                )
                            }
                        }
                    }
                    
                    IconButton(
                        onClick = { viewModel.dismissCampaign(campaign.id) },
                        modifier = Modifier
                            .size(24.dp)
                            .testTag("dismiss_campaign_${campaign.id}")
                    ) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Dismiss Campaign",
                            tint = SpaceLavender.copy(alpha = 0.6f),
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
                
                Spacer(modifier = Modifier.height(10.dp))
                
                // Title and Subtitle
                Text(
                    text = campaign.title,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 16.sp,
                    color = GalacticWhite
                )
                Text(
                    text = campaign.subtitle,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 12.sp,
                    color = CelestialGold,
                    modifier = Modifier.padding(top = 2.dp)
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                
                // Campaign Description
                Text(
                    text = campaign.description,
                    fontSize = 11.sp,
                    color = SpaceLavender,
                    lineHeight = 16.sp
                )
                
                Spacer(modifier = Modifier.height(14.dp))
                
                // Action row with Indicators and CTA Button
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Carousel Dot Indicators
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        campaigns.forEachIndexed { index, _ ->
                            val isSelected = index == activeIndex
                            Box(
                                modifier = Modifier
                                    .size(if (isSelected) 8.dp else 6.dp)
                                    .background(
                                        color = if (isSelected) CelestialGold else SpaceLavender.copy(alpha = 0.3f),
                                        shape = CircleShape
                                    )
                                    .clickable { activeIndex = index }
                            )
                        }
                    }
                    
                    // CTA Button
                    Button(
                        onClick = { viewModel.handleCampaignAction(campaign) },
                        colors = ButtonDefaults.buttonColors(containerColor = CelestialGold),
                        shape = RoundedCornerShape(10.dp),
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 6.dp),
                        modifier = Modifier
                            .height(36.dp)
                            .testTag("campaign_action_${campaign.id}")
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = campaign.actionText,
                                color = DeepMidnight,
                                fontWeight = FontWeight.Bold,
                                fontSize = 11.sp
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("⚡", fontSize = 11.sp)
                        }
                    }
                }
            }
        }
    }
}


