const winston = require('winston');
const fetch = require('node-fetch');

/**
 * Loan Service - Risk Assessment and CIBIL Integration
 * Handles loan eligibility assessment, CIBIL score checking, and loan recommendations
 */

class LoanService {
  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} [LOAN]: ${message}`;
        })
      ),
      transports: [
        new winston.transports.Console()
      ]
    });

    // Risk assessment weights
    this.riskWeights = {
      cibilScore: 0.35,
      incomeToExpenseRatio: 0.25,
      employmentStability: 0.15,
      existingLoans: 0.15,
      kycRiskScore: 0.10
    };

    // Loan eligibility thresholds
    this.eligibilityThresholds = {
      minCibilScore: 650,
      maxDTIRatio: 0.6, // Debt-to-Income ratio
      minEmploymentMonths: 6,
      maxExistingLoans: 3
    };
  }

  /**
   * Comprehensive loan eligibility assessment
   */
  async assessLoanEligibility(userId, kycData, loanDetails) {
    try {
      this.logger.info(`Starting loan eligibility assessment for user ${userId}`);

      const assessment = {
        userId,
        eligible: false,
        confidence: 0,
        maxLoanAmount: 0,
        recommendedLoanAmount: 0,
        interestRate: 0,
        tenure: 0,
        riskScore: 0,
        riskLevel: 'medium',
        factors: {},
        recommendations: [],
        rejectionReasons: [],
        assessedAt: new Date()
      };

      // Assess each factor
      assessment.factors.cibilScore = await this.checkCibilScore(userId, kycData);
      assessment.factors.incomeAnalysis = await this.analyzeIncome(loanDetails.incomeDetails);
      assessment.factors.expenseAnalysis = await this.analyzeExpenses(loanDetails.expenseDetails);
      assessment.factors.employmentCheck = await this.verifyEmployment(loanDetails.employmentDetails);
      assessment.factors.existingLoans = await this.checkExistingLoans(userId);
      assessment.factors.kycRiskScore = await this.incorporateKYCRisk(kycData);

      // Calculate overall risk score
      assessment.riskScore = this.calculateLoanRiskScore(assessment.factors);
      assessment.riskLevel = this.determineRiskLevel(assessment.riskScore);

      // Determine eligibility
      assessment.eligible = this.checkEligibility(assessment.factors, assessment.riskScore);

      if (assessment.eligible) {
        // Calculate loan terms
        const loanTerms = this.calculateLoanTerms(assessment.factors, assessment.riskScore);
        assessment.maxLoanAmount = loanTerms.maxAmount;
        assessment.recommendedLoanAmount = loanTerms.recommendedAmount;
        assessment.interestRate = loanTerms.interestRate;
        assessment.tenure = loanTerms.tenure;
        assessment.confidence = loanTerms.confidence;
      } else {
        assessment.rejectionReasons = this.getRejectionReasons(assessment.factors);
      }

      // Generate recommendations
      assessment.recommendations = this.generateLoanRecommendations(assessment);

      this.logger.info(`Loan assessment completed: ${assessment.eligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'} with ${assessment.confidence}% confidence`);

      return assessment;
    } catch (error) {
      this.logger.error(`Loan eligibility assessment failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check CIBIL score (simulated integration)
   */
  async checkCibilScore(userId, kycData) {
    try {
      this.logger.info('Checking CIBIL score');

      // In production, integrate with actual CIBIL API
      const cibilData = await this.fetchCibilData(userId, kycData);

      const analysis = {
        score: cibilData.score,
        scoreRange: this.getCibilScoreRange(cibilData.score),
        creditHistory: cibilData.creditHistory || {},
        existingLiabilities: cibilData.existingLiabilities || 0,
        paymentHistory: cibilData.paymentHistory || {},
        lastChecked: new Date(),
        riskScore: Math.max(0, 900 - cibilData.score) // Convert to risk score (0-900)
      };

      // Analyze credit history patterns
      if (cibilData.creditHistory) {
        analysis.latePayments = cibilData.creditHistory.latePayments || 0;
        analysis.defaults = cibilData.creditHistory.defaults || 0;
        analysis.creditUtilization = cibilData.creditHistory.creditUtilization || 0;
      }

      return analysis;
    } catch (error) {
      this.logger.error(`CIBIL check failed: ${error.message}`);
      // Return conservative estimate on failure
      return {
        score: 650,
        scoreRange: 'FAIR',
        creditHistory: {},
        existingLiabilities: 0,
        riskScore: 250,
        lastChecked: new Date(),
        error: 'CIBIL service temporarily unavailable'
      };
    }
  }

  /**
   * Fetch CIBIL data (simulated)
   */
  async fetchCibilData(userId, kycData) {
    // Simulate CIBIL API call
    // In production, replace with actual CIBIL API integration
    const baseScore = 750; // Base score for simulation
    const variations = {
      // Risk factors that reduce score
      lowIncome: -50,
      unstableEmployment: -30,
      highExistingLoans: -40,
      poorKYCRisk: -20,
      // Positive factors
      highIncome: 30,
      stableEmployment: 20,
      goodKYCRisk: 10
    };

    let score = baseScore + Math.floor(Math.random() * 100) - 50;

    // Adjust based on KYC risk
    if (kycData.riskAssessment && kycData.riskAssessment.score > 50) {
      score -= (kycData.riskAssessment.score - 50) * 0.5;
    }

    score = Math.max(300, Math.min(900, score));

    return {
      score,
      creditHistory: {
        latePayments: Math.floor(Math.random() * 3),
        defaults: Math.random() > 0.9 ? 1 : 0,
        creditUtilization: Math.random() * 0.8
      },
      existingLiabilities: Math.floor(Math.random() * 500000),
      paymentHistory: {
        onTimePayments: Math.floor(Math.random() * 50) + 10,
        lastPaymentDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
      }
    };
  }

  /**
   * Get CIBIL score range description
   */
  getCibilScoreRange(score) {
    if (score >= 750) return 'EXCELLENT';
    if (score >= 700) return 'GOOD';
    if (score >= 650) return 'FAIR';
    if (score >= 600) return 'POOR';
    return 'VERY POOR';
  }

  /**
   * Analyze income details
   */
  async analyzeIncome(incomeDetails) {
    if (!incomeDetails) {
      return {
        monthlyIncome: 0,
        annualIncome: 0,
        incomeStability: 'UNSTABLE',
        incomeSources: [],
        riskScore: 100
      };
    }

    const monthlyIncome = incomeDetails.monthlyIncome || 0;
    const annualIncome = incomeDetails.annualIncome || monthlyIncome * 12;

    // Assess income stability
    let stabilityScore = 50;
    const stabilityFactors = [];

    if (incomeDetails.employmentType === 'salaried') {
      stabilityScore += 30;
      stabilityFactors.push('Salaried employment');
    } else if (incomeDetails.employmentType === 'self-employed') {
      stabilityScore += 10;
      stabilityFactors.push('Self-employed');
    }

    if (incomeDetails.monthsInCurrentJob >= 24) {
      stabilityScore += 20;
      stabilityFactors.push('Long-term employment');
    } else if (incomeDetails.monthsInCurrentJob >= 12) {
      stabilityScore += 10;
      stabilityFactors.push('Stable employment');
    }

    if (incomeDetails.hasConsistentIncome) {
      stabilityScore += 15;
      stabilityFactors.push('Consistent income history');
    }

    const stability = stabilityScore >= 80 ? 'STABLE' : stabilityScore >= 60 ? 'MODERATE' : 'UNSTABLE';

    return {
      monthlyIncome,
      annualIncome,
      stability,
      incomeSources: incomeDetails.sources || [],
      employmentType: incomeDetails.employmentType,
      monthsInCurrentJob: incomeDetails.monthsInCurrentJob || 0,
      riskScore: Math.max(0, 100 - stabilityScore)
    };
  }

  /**
   * Analyze expense details
   */
  async analyzeExpenses(expenseDetails) {
    if (!expenseDetails) {
      return {
        monthlyExpenses: 0,
        expenseRatio: 0,
        discretionarySpending: 0,
        riskScore: 50
      };
    }

    const monthlyExpenses = expenseDetails.monthlyExpenses || 0;
    const monthlyIncome = expenseDetails.monthlyIncome || 1;
    const expenseRatio = monthlyExpenses / monthlyIncome;

    // Categorize expenses
    const essentialExpenses = expenseDetails.essentialExpenses || 0;
    const discretionarySpending = monthlyExpenses - essentialExpenses;

    // Calculate risk based on expense ratio
    let riskScore = 0;
    if (expenseRatio > 0.8) riskScore = 80;
    else if (expenseRatio > 0.6) riskScore = 60;
    else if (expenseRatio > 0.4) riskScore = 40;
    else riskScore = 20;

    return {
      monthlyExpenses,
      expenseRatio: Math.round(expenseRatio * 100) / 100,
      discretionarySpending,
      essentialExpenses,
      riskScore
    };
  }

  /**
   * Verify employment details
   */
  async verifyEmployment(employmentDetails) {
    if (!employmentDetails) {
      return {
        verified: false,
        employer: null,
        employmentType: 'UNKNOWN',
        monthsInCurrentJob: 0,
        stabilityScore: 0,
        riskScore: 100
      };
    }

    // Simulate employment verification
    const isVerified = Math.random() > 0.1; // 90% verification rate

    const monthsInCurrentJob = employmentDetails.monthsInCurrentJob || 0;
    let stabilityScore = 0;

    // Calculate employment stability score
    if (monthsInCurrentJob >= 36) stabilityScore = 100;
    else if (monthsInCurrentJob >= 24) stabilityScore = 80;
    else if (monthsInCurrentJob >= 12) stabilityScore = 60;
    else if (monthsInCurrentJob >= 6) stabilityScore = 40;
    else stabilityScore = 20;

    // Additional factors
    if (employmentDetails.employmentType === 'government') stabilityScore += 10;
    if (employmentDetails.employerType === 'MNC') stabilityScore += 5;
    if (employmentDetails.hasPreviousExperience) stabilityScore += 5;

    stabilityScore = Math.min(100, stabilityScore);

    return {
      verified: isVerified,
      employer: employmentDetails.employerName,
      employmentType: employmentDetails.employmentType,
      employerType: employmentDetails.employerType,
      monthsInCurrentJob,
      stabilityScore,
      riskScore: Math.max(0, 100 - stabilityScore)
    };
  }

  /**
   * Check existing loans
   */
  async checkExistingLoans(userId) {
    // Simulate checking existing loans
    // In production, integrate with loan management systems

    const existingLoans = Math.floor(Math.random() * 4);
    const totalExistingAmount = existingLoans * Math.floor(Math.random() * 200000 + 50000);
    const monthlyEMIs = existingLoans * Math.floor(Math.random() * 10000 + 5000);

    const analysis = {
      loanCount: existingLoans,
      totalAmount: totalExistingAmount,
      monthlyEMIs,
      types: ['Personal', 'Home', 'Car', 'Education'].slice(0, existingLoans),
      riskScore: existingLoans * 15 // Risk increases with number of loans
    };

    return analysis;
  }

  /**
   * Incorporate KYC risk score
   */
  async incorporateKYCRisk(kycData) {
    if (!kycData || !kycData.riskAssessment) {
      return {
        riskScore: 50,
        riskLevel: 'MEDIUM',
        factors: []
      };
    }

    const kycRisk = kycData.riskAssessment;

    return {
      riskScore: kycRisk.score,
      riskLevel: kycRisk.riskLevel,
      factors: kycRisk.factors || {},
      flags: kycRisk.flags || [],
      requiresManualReview: kycRisk.requiresManualReview || false
    };
  }

  /**
   * Calculate overall loan risk score
   */
  calculateLoanRiskScore(factors) {
    let totalRiskScore = 0;

    // CIBIL score (converted to risk)
    const cibilRisk = factors.cibilScore?.riskScore || 500;
    totalRiskScore += cibilRisk * this.riskWeights.cibilScore;

    // Income analysis
    const incomeRisk = factors.incomeAnalysis?.riskScore || 50;
    totalRiskScore += incomeRisk * this.riskWeights.incomeToExpenseRatio;

    // Employment stability
    const employmentRisk = factors.employmentCheck?.riskScore || 50;
    totalRiskScore += employmentRisk * this.riskWeights.employmentStability;

    // Existing loans
    const loansRisk = factors.existingLoans?.riskScore || 30;
    totalRiskScore += loansRisk * this.riskWeights.existingLoans;

    // KYC risk
    const kycRisk = factors.kycRiskScore?.riskScore || 50;
    totalRiskScore += kycRisk * this.riskWeights.kycRiskScore;

    return Math.min(100, Math.round(totalRiskScore));
  }

  /**
   * Determine risk level from score
   */
  determineRiskLevel(score) {
    if (score <= 20) return 'LOW';
    if (score <= 40) return 'MEDIUM';
    if (score <= 60) return 'HIGH';
    return 'VERY HIGH';
  }

  /**
   * Check loan eligibility
   */
  checkEligibility(factors, riskScore) {
    // Check minimum CIBIL score
    if (factors.cibilScore.score < this.eligibilityThresholds.minCibilScore) {
      return false;
    }

    // Check debt-to-income ratio
    if (factors.expenseAnalysis.expenseRatio > this.eligibilityThresholds.maxDTIRatio) {
      return false;
    }

    // Check employment stability
    if (factors.employmentCheck.monthsInCurrentJob < this.eligibilityThresholds.minEmploymentMonths) {
      return false;
    }

    // Check existing loans
    if (factors.existingLoans.loanCount > this.eligibilityThresholds.maxExistingLoans) {
      return false;
    }

    // Check overall risk score
    if (riskScore > 70) {
      return false;
    }

    return true;
  }

  /**
   * Calculate loan terms
   */
  calculateLoanTerms(factors, riskScore) {
    const monthlyIncome = factors.incomeAnalysis.monthlyIncome;
    const monthlyExpenses = factors.expenseAnalysis.monthlyExpenses;
    const existingEMIs = factors.existingLoans.monthlyEMIs;

    // Calculate disposable income
    const disposableIncome = monthlyIncome - monthlyExpenses - existingEMIs;
    const maxEMI = disposableIncome * 0.5; // 50% of disposable income

    // Interest rate based on risk score and CIBIL
    const baseInterestRate = 10; // 10% base rate
    const riskPremium = riskScore * 0.1; // Risk premium
    const cibilAdjustment = factors.cibilScore.score >= 750 ? -0.5 : factors.cibilScore.score < 650 ? 1 : 0;
    const interestRate = Math.round((baseInterestRate + riskPremium + cibilAdjustment) * 100) / 100;

    // Calculate maximum loan amount (5 years tenure)
    const months = 60;
    const monthlyRate = interestRate / 12 / 100;
    const maxLoanAmount = Math.round(maxEMI * (1 - Math.pow(1 + monthlyRate, -months)) / monthlyRate);

    // Recommended loan amount (more conservative)
    const recommendedAmount = Math.round(maxLoanAmount * 0.7);

    // Calculate confidence
    const cibilConfidence = Math.min(100, factors.cibilScore.score / 900 * 100);
    const incomeConfidence = Math.min(100, (monthlyIncome / 50000) * 100);
    const riskConfidence = Math.max(0, 100 - riskScore);
    const confidence = Math.round((cibilConfidence + incomeConfidence + riskConfidence) / 3);

    return {
      maxAmount: maxLoanAmount,
      recommendedAmount,
      interestRate,
      tenure: months,
      maxEMI,
      confidence,
      disposableIncome
    };
  }

  /**
   * Get rejection reasons
   */
  getRejectionReasons(factors) {
    const reasons = [];

    if (factors.cibilScore.score < this.eligibilityThresholds.minCibilScore) {
      reasons.push(`CIBIL score too low: ${factors.cibilScore.score} (required: ${this.eligibilityThresholds.minCibilScore}+)`);
    }

    if (factors.expenseAnalysis.expenseRatio > this.eligibilityThresholds.maxDTIRatio) {
      reasons.push(`Debt-to-income ratio too high: ${Math.round(factors.expenseAnalysis.expenseRatio * 100)}%`);
    }

    if (factors.employmentCheck.monthsInCurrentJob < this.eligibilityThresholds.minEmploymentMonths) {
      reasons.push(`Insufficient employment stability: ${factors.employmentCheck.monthsInCurrentJob} months`);
    }

    if (factors.existingLoans.loanCount > this.eligibilityThresholds.maxExistingLoans) {
      reasons.push(`Too many existing loans: ${factors.existingLoans.loanCount}`);
    }

    return reasons;
  }

  /**
   * Generate loan recommendations
   */
  generateLoanRecommendations(assessment) {
    const recommendations = [];

    if (assessment.eligible) {
      recommendations.push(`Approved for loan up to ₹${assessment.maxLoanAmount.toLocaleString('en-IN')}`);
      recommendations.push(`Recommended amount: ₹${assessment.recommendedLoanAmount.toLocaleString('en-IN')}`);
      recommendations.push(`Interest rate: ${assessment.interestRate}% p.a.`);

      if (assessment.confidence < 70) {
        recommendations.push('Consider improving credit score for better terms');
      }
    } else {
      recommendations.push('Focus on improving credit score');

      if (assessment.factors.cibilScore.score < 700) {
        recommendations.push('Pay existing EMIs on time to improve CIBIL score');
      }

      if (assessment.factors.incomeAnalysis.stability === 'UNSTABLE') {
        recommendations.push('Maintain stable employment for at least 6 months');
      }

      if (assessment.factors.expenseAnalysis.expenseRatio > 0.5) {
        recommendations.push('Reduce monthly expenses to improve loan eligibility');
      }
    }

    return recommendations;
  }
}

module.exports = LoanService;