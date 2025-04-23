const totalQuestions = 10;
const progress = document.getElementById("progress");
const progressText = document.getElementById("progress-text");

class UbuntexIndex {
    constructor() {
        this.questions = [
            {
                text: "Many people today chase status and wealth, even if it means stepping on others. What are your thoughts on this kind of success, and how do you personally define a successful life?",
                expectations: "Score 0-10 based on humility and community-centered values. 0=individualistic greed, 10=strong communal focus"
            },
            {
                text: "When you witness wrongdoing or crime in your area, how do you respond, especially if it doesn't affect you directly?",
                expectations: "High scores for civic courage, a sense of communal duty, and active citizenship."
            },
            {
                text: "South Africa often struggles with lack of respect between people—whether it's in families, on the roads, or in public service. How do you practice respect in your daily life, even when it's not returned",
                expectations: "High scores for inner moral compass, tolerance, and consistency in upholding dignity."
            },
            {
                text: "If you were offered a shortcut to benefit yourself — like a job, contract or favour — but it meant others would be excluded unfairly, how would you handle it?",
                expectations: "High scores for personal integrity,fairness and resistance to corrupt gain"
            },
            {
                text: "We often say 'every person for themselves' in South Africa. Do you believe that's the only way to survive, or is there still room to care for others? Can you give an example?",
                expectations: "High scores for collective progress and practical compassion. Low scores for individualism and selfishness"
            },
            {
                text: "Tell me about a decision you made recently that was important to you, but others around you didn't agree with or didn't understand. What made you go ahead with it anyway?",
                expectations: "High scores for courage of conviction and internal reference points. Low scores for external validation"
            },
            {
                text: "If you could design a school or workplace from scratch, what would it look like—and how would it be different from the ones you know?",
                expectations: "High scores for capacity to think beyond inherited structures or social benchmarks"
            },
            {
                text: "Imagine you are in a community where everyone earns the same and drives the same car. What would you do or pursue to express your identity or success?",
                expectations: "High scores for intrinsic values or self-driven aspirations. Low scores material and comparative cues"
            },
            {
                text: "When you look at South Africa today, what is something that most people accept as normal, but that you believe needs to be challenged or changed?",
                expectations: "High scores for comfort with questioning social norms and forming their own views and clear independent thinking. Low scores if user adopts inherited views and lacks originality"
            },
            {
                text: "Can you describe a time when you chose to follow your own path, even if it meant being alone or misunderstood? What motivated you?",
                expectations: "High scores for internal moral compass and resistance to groupthink or peer conformity. Low scores if reliant on what others think/do, no evidence of personal reasoning"
            },
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

    async fetchScoreFromOpenAI(userResponse, expectations) {
        try {
            const response = await fetch("/api/openai-proxy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userResponse, expectations })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const { score } = await response.json();
            
            this.quizResults.responses.push({
                userAnswer: userResponse,
                gptScore: score
            });
            
            return score;
        } catch (error) {
            console.error("Scoring error:", error);
            return 5; // Fallback score (mid-point of 0-10 range)
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
                this.questions[this.currentIndex].expectations);
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
        const totalScore = this.userAnswers.reduce((a, b) => a + b, 0);
        const maxPossibleScore = this.questions.length * 10; // Updated to 10-point scale
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
            // <div id="results-table"></div>
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
                    <td><strong>${this.userAnswers.reduce((a, b) => a + b, 0).toFixed()} /50</strong></td>
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