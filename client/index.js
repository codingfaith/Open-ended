const totalQuestions = 44;
const progress = document.getElementById("progress");
const progressText = document.getElementById("progress-text");

class UbuntexIndex {
    constructor() {
        this.questions = [
            {
                // empathy
                text: "In general, when is it right to consider the needs of others?", //1
                type: "multiple-choice",
                choices: {
                    A: ["Only after mine are met", 2],
                    B: ["Before mine are met", 8],
                    C: ["Together with mine", 5],
                    D: ["It's not important to consider the needs of others", 1]
                },
                type: "multiple-choice",
                category: "empathy"
            },{
                text: "Do you feel that others care about your needs in general?", //2
                type: "multiple-choice",
                choices: {
                    A: ["Only after theirs are met", 6],
                    B: ["Yes, above their own", 4],
                    C: ["Yes, at the same time as their needs", 3],
                    D: ["Its not important for them to consider my needs", 5]
                },
                type: "multiple-choice",
                category: "empathy"
            },{
                text: "Who in your opinion is to blame for the bad things that you face from time to time?", //3
                choices: {
                    A: ["Others are usually to blame ", 1],
                    B: ["I am normally the one to blame ", 6],
                    C: ["A combination of me and others", 4],
                    D: ["No one is to blame things just happen", 2],
                },
                type: "multiple-choice",
                category: "empathy"
            },{
                text: "When comparing your status in life  to that of others around you, where would you like to be?", //4
                choices: {
                    A: ["A lot better than others ", 1],
                    B: ["Better than others", 2],
                    C: ["Same as others ", 5],
                    D: ["It does not matter", 7]
                },
                type: "multiple-choice",
                category: "empathy"
            },{ text: "How do you feel about working with others to achieve a common goal?", //5
                choices: {
                    A: ["It is not easy to work with others ", 1],
                    B: ["Its not necessary to work with others ", 3],
                    C: ["More can be achieved when working with others", 5],
                    D: ["Working with others is the only way of achieving lasting results ", 7]
                },
                type: "multiple-choice",
                category: "empathy"
            },{        
            //ratings
                text: "On a 10-point scale where 1 means very low and 10 means very high, how would you rate your ability to understand yourself?", //6
                scale: 10,
                type: "scale",
                category: "empathy" //6
            },{
                text: "On a 10-point scale where 1 means very low and 10 means very high, how would you rate your ability to understand others in the world?", //7
                scale: 10,
                type: "scale",
                category: "empathy" //7
            },{
                text: "On a 10-point scale where 1 means very low and 10 means very high, how would you rate your ability to understand others in your community?", //8
                scale: 10,
                type: "scale",
                category: "empathy" //8
            },{
                text: "On a 10-point scale where 1 means very low and 10 means very high, how would you rate your ability to understand others in your country?", //9
                scale: 10,
                type: "scale",
                category: "empathy" //9
            },{
                text: "On a 10-point scale where 1 means very low and 10 means very high, how would you rate your ability to understand others in your family?", //10
                scale: 10,
                type: "scale",
                category: "empathy" //10
            },{
                text: "Many people today chase status and wealth, even if it means stepping on others. What are your thoughts on this kind of success, and how do you personally define a successful life?",
                expectations: "Score 0-10 based on humility and community-centered values. 0=individualistic greed, 10=strong communal focus",
                type: "open-ended",
                category: "empathy" //11
            },{ 
            // respect
                text: "How important is showing respect to other human beings?", //12
                choices: {
                    A: ["It depends on who ", 2],
                    B: ["Everyone needs to be respected", 5],
                    C: ["Respect is a luxury", 1]
                },
                type: "multiple-choice",
                category: "respect"
            },{
                text: "How do you feel when someone you don't know is being disrespected?", //13
                choices: {
                    A: ["It is none of my business, I don't care ", 1],
                    B: ["I also feel disrespected ", 6],
                    C: ["I feel bad about our society", 3]
                },
                type: "multiple-choice",
                category: "respect"
            },{
                text: "What would you consider to be a true sign of showing respect to others?", //14
                choices: {
                    A: ["Acting out your respect ", 7],
                    B: ["Not having negative thoughts about them", 3]
                },
                type: "multiple-choice",
                category: "respect"
            },{
                text: "Rate on a 10-point scale your respect for yourself",
                scale: 10,
                type: "scale",
                category: "respect" //15
            },{
                text: "Rate on a 10-point scale your respect for your family members in general",
                scale: 10,
                type: "scale",
                category: "respect" //16
            },{
                text: "Rate on a 10-point scale your respect for people around the world",
                scale: 10,
                type: "scale",
                category: "respect" //17
            },{
                text: "Rate on a 10-point scale your respect for your community", 
                scale: 10,
                type: "scale",
                category: "respect" //18

            },{
                text: "Rate on a 10-point scale your respect for the people in your country", 
                scale: 10,
                type: "scale",
                category: "respect" //19
            },{
                text: "Rate on a 10-point scale your respect authorities in general",
                scale: 10,
                type: "scale",
                category: "respect" //20
            },{
                text: "When you witness wrongdoing or crime in your area, how do you respond, especially if it doesn't affect you directly?",
                expectations: "Score 0-10 based on civic courage and communal duty. 0=no action, 10=strong intervention",
                type: "open-ended",
                category: "communal responsibility" //21
            },{
            // Dignity
                text: "What matters the most to you about how you see others in a social setting?", //22
                choices: {
                    A: ["Their appearance and presence", 1],
                    B: ["Their qualifications and skills  ", 3],
                    C: ["Their dignity and worth as a person ", 6],
                    D: ["Their priorities and values ", 4]
                },
                type: "multiple-choice",
                category: "dignity"
            },{
                text: "South Africa often struggles with lack of respect between people — whether it's in families, on the roads, or in public service. How do you practice respect in your daily life, even when it's not returned",
                expectations: "Score 0-10 based on consistency in upholding dignity and inner moral compass. 0=no respect shown, 10=consistent respect",
                type: "open-ended",
                category: "respect" //23
            },{
                text: "How would you describe how you want others to treat you in social settings?",
                choices: {
                    A: ["Based on my appearance and presence ", 1],
                    B: ["Based on my qualifications and skills ", 3],
                    C: ["With honour simply because I am human ", 6]
                },
                type: "multiple-choice",
                category: "dignity" //24
            },{
                text: "If you were offered a shortcut to benefit yourself — like a job, contract or favour — but it meant others would be excluded unfairly, how would you handle it?",
                expectations: "Score 0-10 based on personal integrity,fairness and resistance to corrupt gain. 0=would take shortcut, 10=would refuse unfair advantage",
                type: "open-ended",
                category: "dignity" //25
            },{
                text: "Who in your view in any situation is responsible for doing the right thing?",
                choices: {
                    A: ["Myself first and foremost ", 7],
                    B: ["Others", 2],
                    C: ["Everyone", 3]
                },
                type: "multiple-choice",
                category: "dignity" //26
            },{
                text: "We often say 'every person for themselves' in South Africa. Do you believe that's the only way to survive, or is there still room to care for others? Can you give an example?",
                expectations: "Score 0-10 based on collective progress. 0=extreme individualism, 10=strong communal care",
                type: "open-ended",
                category: "empathy" //27
            },{
                text: "On a 10-point scale how would you rate your importance as a human being, in general?",
                scale: 10,
                type: "scale",
                category: "dignity" //28
            },{
                text: "On a 10-point scale how would you rate the importance of others?",
                scale: 10,
                type: "scale",
                category: "dignity" //29
            },{
                text: "On a 10-point scale how would you rate the importance of dignified thoughts that show respect for others?", 
                scale: 10,
                type: "scale",
                category: "dignity" //30
            },{
                text: "On a 10-point scale how would you rate the importance of your value system and beliefs?", 
                scale: 10,
                type: "scale",
                category: "dignity" //31
            },{
                text: "On a 10-point scale how would you rate the importance of dignified actions that show respect for others?",
                scale: 10,
                type: "scale",
                category: "dignity" //32
            },{
                text: "Tell me about a decision you made recently that was important to you, but others around you didn't agree with or didn't understand. What made you go ahead with it anyway?",
                expectations: "High scores for courage of conviction and internal reference points. Low scores for external validation",
                type: "open-ended",
                category: "original thinking" //33
            },{
            // Communal Responsibility
                text: "Do you consider yourself to be a responsible citizen?",
                choices: {
                    A: ["It depends on the situation ", 2],
                    B: ["Sometimes", 3],
                    C: ["Always", 5]
                },
                type: "multiple-choice",
                category: "communal responsibility" //34
            },{
                text: "If you could design a school or workplace from scratch, what would it look like — and how would it be different from the ones you know?",
                expectations: "High scores for capacity to think beyond inherited structures or social benchmarks 0=lack of originality and creativity",
                type: "open-ended",
                category: "original thinking" //35
            },{
                text: "Have you in the past 12 months done anything taking longer than 30 minutes to help your family?",
                choices: {
                    A: ["Yes", 4],
                    B: ["No", 1]
                },
                type: "multiple-choice",
                category: "communal responsibility" //36
            },{
                text: "Have you in the past 12 months done anything taking longer than 30 minutes to help your community?",
                choices: {
                    A: ["Yes", 5],
                    B: ["No", 1]
                },
                type: "multiple-choice",
                category: "communal responsibility" //37
            },{
                text: "Imagine you are in a community where everyone earns the same and drives the same car. What would you do or pursue to express your identity or success?",
                expectations: "High scores for intrinsic values or self-driven aspirations. Low scores material and comparative cues",
                type: "open-ended",
                category: "original thinking" //38
            },{
                text: "When you look at South Africa today, what is something that most people accept as normal, but that you believe needs to be challenged or changed?",
                expectations: "High scores for comfort with questioning social norms and forming their own views and clear independent thinking. Low scores if user adopts inherited views and lacks originality",
                type: "open-ended",
                category: "original thinking" //39
            },{
                text: "Have you in the past 12 months done anything taking longer than 30 minutes to help your country?", //40
                choices: {
                    A: ["Yes", 6],
                    B: ["No", 1]
                },
                type: "multiple-choice",
                category: "communal responsibility"
            },{
                text: "Can you describe a time when you chose to follow your own path, even if it meant being alone or misunderstood? What motivated you?",
                expectations: "High scores for internal moral compass and resistance to groupthink or peer conformity. Low scores if reliant on what others think/do, no evidence of personal reasoning",
                type: "open-ended",
                category: "original thinking" //41
            },{
                text: "Have you in the past 12 months done anything taking longer than 30 minutes to help the entire world?", //42
                choices: {
                    A: ["Yes", 3],
                    B: ["No", 1]
                },
                type: "multiple-choice",
                category: "communal responsibility"
            },{
                text: "What kind of person would you most likely consider to be a role model?",
                choices: {
                    A: ["A popular and well known person", 1],
                    B: ["A skilled and talented person", 2],
                    C: ["Someone that sacrifices for their community ", 6],
                    D: ["A religious and upright person ", 4]
                },
                type: "multiple-choice",
                category: "dignity" //43
            },{
                text: "Can you rate the importance of service to the community to you personally, on a 10-point scale?",
                scale: 10,
                type: "scale",
                category: "communal responsibility"  //44
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
 
            return score;
        } catch (error) {
            console.error("Scoring error:", error);
            return 5; // Fallback score
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
        optionsContainer.innerHTML = '';
       
        // Clear any previous event listeners
        nextBtn.onclick = null;
        this.currentSelectedAnswer = null;

        if (question.type === "open-ended") {
            // Open-ended question UI
            optionsContainer.innerHTML = `
                <textarea id="user-response" placeholder="Type your answer..." maxlength="150"></textarea>
            `;
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

            nextBtn.onclick = async () => {
                const userResponse = textarea.value.trim();
                if (!userResponse) {
                    alert("Please enter your response before proceeding.");
                    return;
                }
                
                nextBtn.disabled = true;
                nextBtn.textContent = "Scoring...";
                charCounter.innerText = ""
                
                try {
                    const score = await this.fetchScoreFromOpenAI(userResponse, question.expectations);
                        this.userAnswers.push(score);
                        this.quizResults.responses.push({
                            question: question.text,
                            userAnswer:userResponse,
                        })
                        this.currentIndex++;
                        this.showQuestion();
                    } finally {
                        nextBtn.textContent = this.currentIndex === this.questions.length - 1 
                            ? "Submit and See Results" 
                            : "Next";
                        nextBtn.disabled = false;
                }
                
            }
        } else if (question.type === "multiple-choice") {
            // Multiple choice question UI
            Object.entries(question.choices).forEach(([key, value]) => {
                const button = document.createElement("button");
                button.textContent = `${key}: ${value[0]}`;
                button.className = "option-button";
                button.onclick = () => {
                    // Remove active class from all buttons
                    document.querySelectorAll('.option-button').forEach(btn => {
                        btn.classList.remove('active');
                    });
                    // Add active class to clicked button
                    button.classList.add('active');
                    this.currentSelectedAnswer = value[1];
                    nextBtn.disabled = false;
                };
                optionsContainer.appendChild(button);
            });

            nextBtn.onclick = () => {
                if (this.currentSelectedAnswer === null) {
                    alert("Please select an option before proceeding.");
                    return;
                }
                this.userAnswers.push(this.currentSelectedAnswer);
                this.quizResults.responses.push({
                    question: question.text,
                    userAnswer: Object.entries(question.choices).find(([_, v]) => v[1] === this.currentSelectedAnswer)[1][0]
                });
                this.currentIndex++;
                this.showQuestion();
            };

        }else if (question.type === "scale") {
            // Scale question UI
            const sliderContainer = document.createElement("div");
            sliderContainer.className = "slider-container";
            
            const slider = document.createElement("input");
            slider.type = "range";
            slider.min = "0";
            slider.max = question.scale.toString();
            slider.value = "5";
            slider.step = "1";
            slider.className = "scale-slider";
            
            const valueDisplay = document.createElement("div");
            valueDisplay.className = "slider-value";
            valueDisplay.textContent = `Selected: 5 (drag slider)`;
            
            slider.oninput = () => {
                valueDisplay.textContent = `Selected: ${slider.value}`;
                this.currentSelectedAnswer = parseInt(slider.value);
                nextBtn.disabled = false;
            };
            
            sliderContainer.appendChild(slider);
            sliderContainer.appendChild(valueDisplay);
            optionsContainer.appendChild(sliderContainer);
            
            // Add scale labels
            const scaleLabels = document.createElement("div");
            scaleLabels.className = "scale-labels";
            scaleLabels.innerHTML = `
                <span>0 (Very Low)</span>
                <span>${question.scale} (Very High)</span>
            `;
            optionsContainer.appendChild(scaleLabels);

            nextBtn.onclick = () => {
                const answer = this.currentSelectedAnswer || 5; // Default to 5 if not moved
                this.userAnswers.push(answer); 
                this.quizResults.responses.push({
                    question: question.text,
                    userAnswer: answer
                });
                this.currentIndex++;
                this.showQuestion();
            };
        }
        // Update progress bar
        const progressPercentage = (this.currentIndex / totalQuestions) * 100;
        progress.style.width = `${progressPercentage}%`;
        progressText.textContent = `Question ${this.currentIndex + 1} of ${totalQuestions}`;
        
        // Set next button text
        nextBtn.textContent = this.currentIndex === this.questions.length - 1 
            ? "Submit and See Results" 
            : "Next";
        nextBtn.disabled = question.type !== "open-ended"; // Disable for non-open-ended until selection
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    calculateScore() {
        //modify userAnswers array according to the calculation method
        const originalArray = [...this.userAnswers]
        const newArray = [...originalArray]

        // Apply transformations based on array[5]
        const base5 = originalArray[5] / 2
        newArray[6] = originalArray[6] - base5
        newArray[7] = originalArray[7] - base5
        newArray[8] = originalArray[8] - base5
        newArray[9] = originalArray[9] - base5

        // Apply transformations based on array[13]
        const base14 = originalArray[14] / 2
        newArray[15] = originalArray[15] - base14
        newArray[16] = originalArray[16] - base14
        newArray[17] = originalArray[17] - base14
        newArray[18] = originalArray[18] - base14
        newArray[19] = originalArray[19] - base14

        // Apply transformation based on array[22]
        const base27 = originalArray[27] / 2
        newArray[28] = originalArray[28] - base27

        console.log(newArray)

        const totalScore = newArray.reduce((accumulator, currentValue) => accumulator + currentValue, 0)
        const maxPossibleScore = 315
        const finalScore = (totalScore  / maxPossibleScore) * 100 
        localStorage.setItem('ubuntexTestCompleted', 'true') // Mark test as completed in localStorage

        this.displayResults(finalScore)
    }

    displayResults(score) {
        let classification;
        if (score <= 40) classification = "High Risk (Anti-Social)";
        else if (score <= 50) classification = "Low Ubuntu Awareness";
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
            <div class="choiceButtons">
                <button id="answers">Your Answers</button>
                <button id="report">Full Report</button>
            </div>
            <div id="results-table"></div>
        `;
        setTimeout(() => {
            const answersBtn = document.getElementById("answers");
            const reportBtn = document.getElementById("report");
            
            answersBtn.addEventListener("click", () => this.renderResultsTable(), 100 );
            reportBtn.addEventListener("click", () => console.log("report coming"));
        }, 0);
    }
    
    renderResultsTable() {
        // First verify we have all responses
        if (this.quizResults.responses.length !== this.questions.length) {
            console.error("Not all responses have been recorded yet");
            return;
        }

        const table = document.createElement('table');
        table.className = 'results-table';
        
        try {
            // Create table header
            const thead = document.createElement('thead');
            thead.innerHTML = `
                <tr>
                    <th>Question</th>
                    <th>Your Answer</th>
                </tr>
            `;
            table.appendChild(thead);
            
            // Create table body
            const tbody = document.createElement('tbody');
            this.quizResults.responses.forEach((response, index) => {
                const row = document.createElement('tr');
                
                // Question column
                const questionCell = document.createElement('td');
                questionCell.textContent = this.questions[index].text;
                
                // Answer column
                const answerCell = document.createElement('td');
                if (typeof response.userAnswer === 'string') {
                    answerCell.textContent = response.userAnswer;
                } else {
                    answerCell.textContent = response.userAnswer !== undefined 
                        ? response.userAnswer.toString() 
                        : 'N/A';
                }       
                row.appendChild(questionCell);
                row.appendChild(answerCell);
                tbody.appendChild(row);
            });
            table.appendChild(tbody);
            
        } catch (error) {
            console.error('Error rendering results table:', error);
            table.innerHTML = `
                <tr>
                    <td colspan="3">Error loading results. Please try again.</td>
                </tr>
            `;
        }
        
        const container = document.getElementById("results-table");
        if (container) {
            container.innerHTML = '';
            container.appendChild(table);
        }
    }
}
// Initialize the quiz when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const quiz = new UbuntexIndex();
});