const totalQuestions = 5;
const progress = document.getElementById("progress");
const progressText = document.getElementById("progress-text");

class UbuntexIndex {
    constructor() {
        this.questions = [
            {
                text: "You notice someone struggling with heavy bags but you're in a rush. How do you react?",
                expectedAnswers: [
                    { text: "Immediately offer help despite being in a hurry", score: 5 },
                    { text: "Offer help if no one else steps in", score: 4 },
                    { text: "Consider helping but hesitate", score: 3 },
                    { text: "Assume they will manage on their own", score: 2 },
                    { text: "Ignore the situation", score: 1 }
                ]
            },
            {
                text: "When interacting with people from different backgrounds, how would someone describe your approach?",
                expectedAnswers: [
                    { text: "Consistently inclusive and respectful", score: 5 },
                    { text: "Generally open-minded with minor biases", score: 4 },
                    { text: "Neutral, with occasional discomfort", score: 3 },
                    { text: "Selectively open based on familiarity", score: 2 },
                    { text: "Uncomfortable or dismissive", score: 1 }
                ]
            },
            {
                text: "You witness an unfair situation, such as someone being treated unjustly at work or in public. What is your likely response?",
                expectedAnswers: [
                    { text: "Speak up and take action", score: 5 },
                    { text: "Support those affected but avoid confrontation", score: 4 },
                    { text: "Express concern privately", score: 3 },
                    { text: "Ignore it unless directly involved", score: 2 },
                    { text: "Avoid engagement completely", score: 1 }
                ]
            },
            {
                text: "If you strongly disagree with someone's viewpoint, how do you usually handle the discussion?",
                expectedAnswers: [
                    { text: "Remain respectful and open to dialogue", score: 5 },
                    { text: "Express disagreement while trying to understand their perspective", score: 4 },
                    { text: "Defend your stance firmly but listen occasionally", score: 3 },
                    { text: "Dismiss their opinion outright", score: 2 },
                    { text: "Argue aggressively or ignore them", score: 1 }
                ]
            },
            {
                text: "If you had an opportunity to gain an advantage dishonestly, how would you respond?",
                expectedAnswers: [
                    { text: "Reject it outright", score: 5 },
                    { text: "Consider it but likely decline", score: 4 },
                    { text: "Feel conflicted but might take it", score: 3 },
                    { text: "Accept if there's little risk", score: 2 },
                    { text: "Take it without hesitation", score: 1 }
                ]
            }
        ];

        this.currentIndex = 0;
        this.userAnswers = [];
        this.quizResults = {responses: []};
        this.checkTestCompletion();
    }

    checkTestCompletion() {
        const testCompleted = localStorage.getItem('ubuntexTestCompleted');
        if (testCompleted === 'true') {
            this.showCompletionMessage();
            return;
        }
        
        this.startQuiz();
    }

    showCompletionMessage() {
        document.getElementById("quiz-container").style.display = "none";
        const resultContainer = document.getElementById("result");
        resultContainer.style.display = "block";
        resultContainer.innerHTML = `
            <h2>Test Already Completed</h2>
            <p>You have already completed the test on this device.</p>`;
    }

    async fetchScoreFromOpenAI(userResponse, expectedAnswers) {
        try {
            const response = await fetch("/api/openai-proxy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userResponse, expectedAnswers })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const { score } = await response.json(); // Simplified response handling
            
            this.quizResults.responses.push({
                userAnswer: userResponse,
                gptScore: score
            });
            
            return score;
        } catch (error) {
            console.error("Scoring error:", error);
            alert("Scoring service unavailable. Using default score.");
            return 3; // Fallback score
        }
    }

    startQuiz() {
        this.showQuestion();
    }

    showQuestion() {
        const questionContainer = document.getElementById("question");
        const optionsContainer = document.getElementById("options");
        const nextBtn = document.getElementById("next-btn");
        const charCounter = document.getElementById("char-counter");
        
        if (this.currentIndex >= this.questions.length) {
            this.calculateScore();
            return;
        }
        
        const question = this.questions[this.currentIndex];
        questionContainer.textContent = `Question ${this.currentIndex + 1}: ${question.text}`;
        optionsContainer.innerHTML = '<textarea id="user-response" placeholder="Type your answer..." maxlength="150"></textarea>';
        
        charCounter.textContent = `0/150 characters`;
        // Add input event listener for character counting
        const textarea = document.getElementById("user-response");
        textarea.addEventListener('input', (e) => {
        const currentLength = e.target.value.length;
        charCounter.textContent = `${currentLength}/150 characters`;
        
        // Change color when approaching limit
        if (currentLength >= 145) {
            charCounter.style.color = currentLength === 150 ? '#d32f2f' : '#ff9800';
        } else {
            charCounter.style.color = '#666';
        }
    });

        nextBtn.disabled = false;
        nextBtn.textContent = this.currentIndex === this.questions.length - 1 ? "Submit and See Results" : "Next";
        
        // Update progress bar
        const progressPercentage = ((this.currentIndex) / totalQuestions) * 100;
        progress.style.width = progressPercentage + "%";
        progressText.textContent = `Question ${this.currentIndex + 1} of ${totalQuestions}`;
        
        nextBtn.onclick = async () => {
            const userResponse = document.getElementById("user-response").value.trim();
            if (!userResponse) {
                alert("Please enter your response before proceeding.");
                return;
            }
            
            nextBtn.disabled = true;
            nextBtn.textContent = "Scoring...";
            
            try {
                const score = await this.fetchScoreFromOpenAI(userResponse, 
                    this.questions[this.currentIndex].expectedAnswers);
                this.userAnswers.push(score);
                this.currentIndex++;
                this.showQuestion();
            } finally {
                nextBtn.textContent = this.currentIndex === this.questions.length - 1 
                    ? "Submit and See Results" 
                    : "Next";
            }
            window.scrollTo({
                top: 0,
                behavior: 'smooth' // Adds smooth scrolling animation
            })
        };
    }

    calculateScore() {
        const totalScore = this.userAnswers.reduce((accumulator, currentValue) => accumulator + currentValue, 0);
        const maxPossibleScore = this.questions.length * 5;
        const finalScore = (totalScore / maxPossibleScore) * 100;
        localStorage.setItem('ubuntexTestCompleted', 'true');

        this.displayResults(finalScore);
    }

    displayResults(score) {
        let classification;
        if (score <= 20) classification = "High Risk (Anti-Social)";
        else if (score <= 40) classification = "Low Ubuntu Awareness";
        else if (score <= 60) classification = "Moderate Ubuntu Awareness";
        else if (score <= 80) classification = "Strong Ubuntu Traits";
        else if (score <= 100) classification = "Ubuntu Ambassador (High Social Contribution)";
        else classification = "Sorry, your score could not be calculated";
        
        document.getElementById("quiz-container").style.display = "none";
        const resultContainer = document.getElementById("result");
        resultContainer.style.display = "block";
        resultContainer.innerHTML = `
            <h2>Your Ubuntex Index Score: ${score.toFixed(2)}%</h2>
            <p>Classification: ${classification}</p>
            <div id="results-table"></div>
        `;
        this.renderResultsTable();
    }

    renderResultsTable() {
        const table = document.createElement('table');
        table.className = 'results-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Question</th>
                    <th>Your Answer</th>
                    <th>Score</th>
                </tr>
            </thead>
            <tbody>
                ${this.quizResults.responses.map((r, i) => `
                    <tr>
                        <td>${this.questions[i].text}</td>
                        <td>${r.userAnswer}</td>
                        <td>${r.gptScore.toFixed(1)}</td>
                    </tr>
                `).join('')}
                <tr class="total-row">
                    <td colspan="2"><strong>Total Score</strong></td>
                    <td><strong>${this.userAnswers.reduce((a, b) => a + b, 0).toFixed()} /25</strong></td>
                </tr>
            </tbody>
        `;
        document.getElementById("results-table").appendChild(table);
    }
}

// Initialize the quiz when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const quiz = new UbuntexIndex();
});